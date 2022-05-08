import { timeStampable } from '../../Generics/timeStampable.entity';
import { RoomEntity } from 'src/chat/entity/room.entity';
export declare class UserEntity extends timeStampable {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    salt: string;
    role: string;
    birthDate: string;
    country: string;
    city: string;
    rooms: RoomEntity[];
    profileImage: string;
}
