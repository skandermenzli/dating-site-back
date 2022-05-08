import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AddUserDto } from '../user/dto/add-user.dto';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt' ;
import { CredentialsDto } from "../user/dto/credentials.dto";
import { JwtService } from '@nestjs/jwt';
import { use } from "passport";

@Injectable()
export class AuthService {
    constructor(private userService: UserService , private jwtService : JwtService) {}

    async register(userData : AddUserDto) {
        const user = await this.userService.createUser({
          ...userData
        });
        const oldPassword = user.password
        user.salt = await bcrypt.genSalt();
        user.password = await bcrypt.hash(user.password, user.salt);
        try {
          await this.userService.addUser(user);
        } catch (e) {
          throw new ConflictException(`username ${user.username} or email ${user.email} already exists`);
        }
        
        //log the user in
        user.password = oldPassword
        return await   this.login(user)
      }
    
      
      async login(credentials: CredentialsDto) {
        let  {username , password}  = credentials ;
        /*
        * login via username or email
        * */
        const user = await this.userService.findUserByUsername(username)
        if(!user) {
          throw new NotFoundException("username ou password incorrect ") ;
        }
        const hashedPassword = await bcrypt.hash(password, user.salt);
        if(hashedPassword === user.password){
          const payload = {
            firstname:user.firstName,
            lastname:user.lastName,
            country:user.country,
            city:user.city,
            username:user.username,
            email:user.email,
            role:user.role ,
            id:user.id
          }
          const jwt = await this.jwtService.sign(payload);
          return {
            "Token": jwt
          }
        }
        else{
          throw new NotFoundException("username ou password incorrect ") ;
        }
          
      }


      verifyJwt(jwt: string): Promise<any> {
        return this.jwtService.verifyAsync(jwt);
      }


}
