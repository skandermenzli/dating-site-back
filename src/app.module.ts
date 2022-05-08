import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerMiddleware } from './logger.middleware';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import * as dotenv from 'dotenv'
import { MulterModule } from "@nestjs/platform-express";

dotenv.config();

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "mysql",
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) ,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: ["dist/**/*.entity{.ts,.js}"],
      synchronize: true
    }),
    ConfigModule.forRoot({
      isGlobal:true
    }),
    UserModule,
    AuthModule,
    ChatModule,
    MulterModule.register({
      dest: './files'
    })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('user');
  }
}
