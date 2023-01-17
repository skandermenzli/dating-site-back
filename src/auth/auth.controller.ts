import { Body, Controller, Get, Param, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { diskStorage } from 'multer';
import { User } from 'src/decorators/user.decorator';

import { AddUserDto } from 'src/user/dto/add-user.dto';
import { CredentialsDto } from 'src/user/dto/credentials.dto';
import { editFileName, imageFileFilter } from 'src/user/upload.utils';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}


  @Post('register')
  register(
    @Body() registerUserDto: AddUserDto) : Promise<any>//token later
  {
      return this.authService.register(registerUserDto);
  }

  @Post('login')
  login(
    @Body() credentials: CredentialsDto) : Promise<any>//later 
  {
    return this.authService.login(credentials);
  }

  @UseGuards(JwtAuthGuard)
  @Get('guardtest')
  test(
    @User() user
  ){
    console.log("extracted user",user);
    
    return{
      //msg:'passport jwt auth guard works!!!'
      msg : user 
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('editprofil')
  editProfil(
    @Body() editUserDto: any) : Promise<any>//token later
  {
    console.log("Username :  ",editUserDto.username);
      return this.authService.editProfile(editUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('changepassword')
  changePassword(
    @Body() passwords: any) : Promise<any>//token later
  {
    console.log("old password :  ",passwords.oldpassword);
    console.log("new password :  ",passwords.newpassword);
      return this.authService.changePassword(passwords);
  }


  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/profile-pictures',
        filename: editFileName,
      }),
      fileFilter: imageFileFilter,
    }),
  )
  async uploadedFile(@UploadedFile() file,@User() user) {
    console.log(file);
    console.log(user);
    return this.authService.ProfileImage(file.filename,user.id)
    //const profil = await this.userService.findOne(user.id);
    //profil.image = file.filename;
    //await this.userService.updateUser(profil);
    //const response = {
      //originalname: file.originalname,
      //filename: file.filename,
    //};
    
    //return response;
  }

  @Get('/image/:imgpath')
  seeUploadedFile(@Param('imgpath') image, @Res() res) {
    console.log(image)

    console.log("sending profil image back");
    
    return res.sendFile(image, { root: './uploads/profile-pictures' });
  }


  // @UseGuards(JwtAuthGuard)
  // @Post('add')
  // addCats(@Body() categories: any,@User() user) : Promise<any>//token later
  // {
  //   console.log("catssss :  ",categories);
  //     return this.authService.addCategories(user.id,categories) ;
  // }

//   @UseGuards(JwtAuthGuard)
//   @Post('upload')
//   @UseInterceptors(
//     FileInterceptor('image', {
//       storage: diskStorage({
//         destination: './uploads/room-pictures',
//         filename: editFileName,
//       }),
//       fileFilter: imageFileFilter,
//     }),
//   )
//   async uploadedRoomImage(@UploadedFile() file,@Body() id: any) {
//     console.log(file);
  
//     return this.authService.RoomImage(file.filename,id)

// }


}
