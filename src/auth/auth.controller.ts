import { Body, Controller, Get, Param, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { Request } from 'express';
import { User } from 'src/decorators/user.decorator';
import { diskStorage } from 'multer';


import { AddUserDto } from 'src/user/dto/add-user.dto';
import { CredentialsDto } from 'src/user/dto/credentials.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { FileInterceptor } from "@nestjs/platform-express";
import { editFileName, imageFileFilter } from "./utils-upload-image";
import { extname } from "path";

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

  @Post('upload')
  @UseInterceptors(
    FileInterceptor("image", {
      storage: diskStorage({
        destination: './uploads/profileimages',
        filename: editFileName ,
      }),
      fileFilter: imageFileFilter ,
    }),
  )
  async uploadedFile(@UploadedFile() file) {
    const response = {
      originalname: file.originalname,
      filename: file.filename,
    };
    return response;
  }

  @Get('image/:imgpath')
  seeUploadedFile(@Param('imgpath') image, @Res() res) {
    return res.sendFile(image, { root: './files' });
  }

}
