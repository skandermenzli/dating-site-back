import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IPaginationOptions,paginate, Pagination } from 'nestjs-typeorm-paginate';
//import { PayloadInterface } from 'src/auth/interfaces/payload.interface';
import { RoomEntity } from 'src/chat/entity/room.entity';
//import { ChatGateway } from 'src/chat/gateway/chat.gateway';
import { RoomI } from 'src/chat/interfaces/room.interface';
import { UserEntity } from 'src/user/entity/user.entity';
import { UserService } from 'src/user/user.service';

import { Repository } from 'typeorm';
//import { ConnectedUserService } from '../../connected-user/connected-user.service';
import { ConnectedUserService } from 'src/chat/service/connected-user/connected-user.service';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable()
export class RoomService {

  

  constructor(
    @InjectRepository(RoomEntity)
    private readonly roomRepository: Repository<RoomEntity> ,
    private connectedUserService: ConnectedUserService ,
    //private chatGateway: ChatGateway,
    private userService: UserService
  ) { }

  observable$ = new BehaviorSubject(null);

  getMatchedRooms(){
    return this.observable$;
  }

  async createRoom(room: RoomI, creator: UserEntity): Promise<RoomI> {
    const newRoom = await this.addCreatorToRoom(room, creator);
    return await this.roomRepository.save(newRoom);
  }

  async createRoomForPairs(pairs: string[][], obs : BehaviorSubject<any>) {
    try{

      for(let pair of pairs) {
        console.log("pair            :::    " ,pair)
        const room = new RoomEntity();
        const user1 = await this.userService.findUserByUsername(pair[0]);
        const user2 = await this.userService.findUserByUsername(pair[1]);
        room.users = [user1, user2]
        room.name = pair[0] + ' and ' + pair[1] + "'s room" ;
        await this.roomRepository.save(room);
        let connectedUser1 = await this.connectedUserService.findByUser(user1);
        let connectedUser2 = await this.connectedUserService.findByUser(user2);
        if(connectedUser1 && connectedUser1.length > 0){
          if(!obs){
            obs = new BehaviorSubject({socketId :connectedUser1[0].socketId, room })
            console.log("entered 1")
          }else{
            obs.next({socketId :connectedUser1[0].socketId, room })
          console.log("entered 1")
          }
          
        } 
          
        if(connectedUser2 && connectedUser2.length> 0){
          if(!obs){
            obs = new BehaviorSubject({socketId :connectedUser2[0].socketId, room })
            console.log("entered 2")
          }else{
            obs.next({socketId :connectedUser2[0].socketId, room })
          console.log("entered 2")
          }
          
        }  
          
        //this.chatGateway.createdMatchRoom(connectedUser1[0].socketId, room);
        //this.chatGateway.createdMatchRoom(connectedUser2[0].socketId, room);

      }
    }catch(e){
      console.log(e)
    }

  }

  async getRoom(roomId:number) : Promise<RoomI> {
    return this.roomRepository.findOne(roomId,{
      relations : ['users']
    });
  }

  async getMatchedRoomsForUser(userId: number, options: IPaginationOptions): Promise<Pagination<RoomI>> {
    
    const query = this.roomRepository
    .createQueryBuilder('room')
    .leftJoin('room.users', 'user')
    .where('user.id = :userId', {userId})
    .leftJoinAndSelect('room.users', 'all_users')
    .orderBy('room.updated_at', 'DESC') ;

  

    return paginate(query, options);
  }

  async getSearchedRooms(userId: number, options: IPaginationOptions,search:string): Promise<Pagination<RoomI>> {
    const userCategories = await this.userService.getCategoriesForUser(userId);
    const ids = userCategories.map(category =>  category.id);
    console.log(options) 
    search = '%'+search+'%'

    const query = this.roomRepository
    .createQueryBuilder('room')
    .where('room.name LIKE (:search)', {search})
    .orWhere('room.description LIKE (:search)', {search})

    return paginate(query, options);
  }


  async getRoomsForUser(userId: number, options: IPaginationOptions): Promise<Pagination<RoomI>> {
    const userCategories = await this.userService.getCategoriesForUser(userId);
    const ids = userCategories.map(category =>  category.id);
    console.log(ids) 

    //old query
    // const query = this.roomRepository
    // .createQueryBuilder('room')
    // .leftJoin('room.users', 'user')
    // .where('user.id = :userId', {userId})
    // .leftJoinAndSelect('room.users', 'all_users')
    // .orderBy('room.updated_at', 'DESC') ;

    const query = this.roomRepository
    .createQueryBuilder('room')
    .where('room.categoryId IN (:ids)', {ids})

    return paginate(query, options);
  }

  async addCreatorToRoom(room: RoomI, creator: UserEntity): Promise<RoomI> {
    room.users.push(creator);
    return room;

}

  async getRoomEntityById(id: number) : Promise<RoomEntity> {
    return this.roomRepository.findOne(id);
  }

  async updateRoom(room: RoomEntity ) {
    const id = room.id
    console.log(room);
    return await this.roomRepository.update(id,room);
  }

  async RoomImage(image: any,id:any): Promise<any> {
    const room = await this.getRoomEntityById(id);
    if(!room) {
      throw new NotFoundException("You are not allowed to change room ") ;
    }
   
    room.image = image
    console.log("this is the room",room);
    
    await this.updateRoom(room);
    console.log("image has been added");
    
    
    //test
    
    return {
      msg:"picture has been uploaded"
    }
  }
}
