import { OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';

import { UserService } from 'src/user/user.service';
//import { Server } from 'typeorm';
import {  Server } from 'socket.io';
import { RoomService } from '../service/room-service/room/room.service';
import { PageI } from '../interfaces/page.interface';
import { MessageEntity } from "../entity/message.entity";
import { Observable } from "rxjs";
import { MessageI, MessagePaginateI } from "../interfaces/message.interface";
import { ConnectedUserService } from '../service/connected-user/connected-user.service';
import { JoinedRoomService } from '../service/joined-room/joined-room.service';
import { RoomI } from '../interfaces/room.interface';
import { MessageService } from '../service/message/message.service';
import { JoinedRoomI } from '../interfaces/joined.room.interface';
import { ConnectedUserI } from '../interfaces/connected.user.interface';
import { MatchingService } from 'src/matching/matching.service';

interface Data {
  room : RoomI;
  socketId : string ;
}

@WebSocketGateway({ cors: { origin: ['https://hoppscotch.io', 'http://localhost:3000', 'http://localhost:4200'] } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  
  @WebSocketServer()
  server: Server;

  constructor(private roomService:RoomService,
              private userService: UserService,
             // private jwtService:JwtService,
              private authService: AuthService,
              private messageService : MessageService,
              private connectedUserService : ConnectedUserService,
              private joinedRoomService : JoinedRoomService ,
              private matchingAndRoomService : RoomService ,
              private matchingService : MatchingService
              ) {
                  
              }

           

  async onModuleInit() {
   
      await this.connectedUserService.deleteAll();
      await this.joinedRoomService.deleteAll();
  }            


  async handleConnection(socket: Socket) {

    console.log("on connect");
    this.server.emit('message','test')
    
    //change this
    this.matchingAndRoomService.getMatchedRooms().subscribe(obj => {
      if(obj){
        this.createdMatchRoom(obj.socketId,obj.room) ;
        
      }
      console.log("inside the constructor of observable");
       
    }) ;
    //untill this

    try {
      
      const decodedToken = await this.authService.verifyJwt(socket.handshake.headers.authorization);
      //console.log(decodedToken);
      
      const user = await this.userService.findOne(decodedToken.id);
      if (!user) {
        console.log("fail");
        return this.disconnect(socket);
        
      } else {
        console.log(user);
        
        socket.data.user = user;
        const rooms = await this.roomService.getRoomsForUser( socket.data.user.id, {page: 1, limit: 10});
        rooms.meta.currentPage --  //angular paginator
        //this.server.to(socket.id).emit('messages', messages);


        //save connection to db
        await this.connectedUserService.create({socketId:socket.id,user:user});


        // Only emit rooms to the specific connected client
        return this.server.to(socket.id).emit('rooms', rooms);
        console.log("on connect");
        this.server.emit('message','test')
      }
    } catch {
      console.log("Some error Occurred , Disconnecting ...");
      return this.disconnect(socket);
    }
  }

  async handleDisconnect(socket: Socket) {
    await this.connectedUserService.deleteBySocketId(socket.id);
    await this.joinedRoomService.deleteBySocketId(socket.id);
    socket.disconnect();
    
  }

  async createdMatchRoom(socketId: string, room: RoomI){
    this.server.to(socketId).emit('matchedRoom', room);
    console.log("matchedRoom bitch ...",room);
  }

  @SubscribeMessage('sendChoice')
  async onSentChoice(socket: Socket, data: any) {
     let obs = await this.matchingService.add(data.preferenceList,socket.data.user,data.room)
     if (obs)
     obs.subscribe((obj : Data) => {
      if(obj){
        console.log(obj)
      this.server.to(obj.socketId).emit('matchedRoom', obj.room);
      }
      
    })
  }


  private disconnect(socket: Socket) {
    socket.emit('Error12', new UnauthorizedException());
    socket.disconnect();
  }
  

  @SubscribeMessage('createRoom')
  async onCreateRoom(socket: Socket, room: RoomI) {
    const createRoom : RoomI = await this.roomService.createRoom(room,socket.data.user) 
    const user = createRoom.users[0]

    //this line updates all rooms if a new room created , can be optimized
    const connections : ConnectedUserI[] = await this.connectedUserService.findByUser(user)  
    //const connections : ConnectedUserI[] = await this.connectedUserService.findAll()
    console.log(connections);


    const rooms = await this.roomService.getRoomsForUser(user.id,{page:1,limit:10})
    for(const connection of connections) {
      //delete this line to reset
      //const rooms = await this.roomService.getRoomsForUser(connection.user.id,{page:1,limit:10})
      await this.server.to(connection.socketId).emit('rooms', rooms);
    }
    //return await this.roomService.createRoom(room,socket.data.user);

  }

  
  @SubscribeMessage('joinRoom')
  async onJoinRoom(socket: Socket, room: RoomI) {
    const messages = await this.messageService.findMessagesForRoom(room,{page: 1, limit: 100}) ; // fix the limit TODO
    messages.meta.currentPage --  //angular paginator
    //save connection to room
    await this.joinedRoomService.create({socketId:socket.id,user:socket.data.user,room:room});
    // send last messages from room to user 
    console.log(messages)
    await this.server.to(socket.id).emit('messages', messages); 


    //
    this.notifyUsersWithUpdatedRoom(room);

  }

  async notifyUsersWithUpdatedRoom(room: RoomI) {
    const joinedRooms : JoinedRoomI[] = await this.joinedRoomService.findUsersByRoom(room) ;
    const joinedUsers = joinedRooms.map(joinedRoom => joinedRoom.user)
    // send new message to all joined users
    for(const user of joinedRooms){
      await this.server.to(user.socketId).emit('connectedUserAdded', joinedUsers);
    }
  }

  @SubscribeMessage('paginateRooms')
  async  onPaginateRoom(socket: Socket, page : PageI) {
    page.limit = page.limit > 100 ? 100 : page.limit
    page.page ++ ; //angular paginator
    const rooms = await this.roomService.getRoomsForUser(socket.data.user.id,page);
    rooms.meta.currentPage -- //angular paginator
    console.log("in all rooms");
    
    return this.server.to(socket.id).emit('rooms', rooms);
  }

  @SubscribeMessage('paginateMatchedRooms')
  async  onPaginateMatchedRoom(socket: Socket, page : PageI) {
    page.limit = page.limit > 100 ? 100 : page.limit
    page.page ++ ; //angular paginator
    console.log(page);
    
    const rooms = await this.roomService.getMatchedRoomsForUser(socket.data.user.id,page);
    rooms.meta.currentPage -- //angular paginator
    console.log("in users roooms");
    
    return this.server.to(socket.id).emit('matchedRooms', rooms);
  }

  //
  @SubscribeMessage('paginateSearchedRooms')
  async  onSearchedRoom(socket: Socket, page : PageI) {
    page.limit = page.limit > 100 ? 100 : page.limit
    page.page ++ ; //angular paginator
    console.log("the page::",page);
    
    const rooms = await this.roomService.getSearchedRooms(socket.data.user.id,page,page.search);
    rooms.meta.currentPage -- //angular paginator
    console.log(rooms);
    
    
    return this.server.to(socket.id).emit('rooms', rooms);
  }

  @SubscribeMessage('leaveRoom')
  async onLeaveRoom(socket: Socket , room: RoomI) {
    
    await this.joinedRoomService.deleteBySocketId(socket.id);
    this.notifyUsersWithUpdatedRoom(room)

  }


  @SubscribeMessage('addMessage')
  async onAddMessage(socket: Socket,message : MessageI) {
    const createMessage : MessageI = await this.messageService.create({...message,user:socket.data.user});
    const room:RoomI = await this.roomService.getRoom(createMessage.room.id) ;
    const joinedUsers : JoinedRoomI[] = await this.joinedRoomService.findByRoom(room) ;
    // send new message to all joined users
    for(const user of joinedUsers){
      await this.server.to(user.socketId).emit('messageAdded', createMessage);
    }
  }


  // @SubscribeMessage('sendMessage')
  // async onSendMessage(socket : Socket,message:MessageEntity){
  //   await this.messageService.create(message);
  // }

  @SubscribeMessage('getMessages')
  async onGetMessages(socket : Socket){
   // const room = await this.joinedRoomService.findByUser(socket.data.user)  fix this !!!
   const messages  = []//await this.messageService.findMessagesForRoom(room,{})
    //console.log(messages);
    this.server.to(socket.id).emit('messages', messages);
    return messages
  }
}
