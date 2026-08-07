import photo01 from '../assets/photos/01.jpg?url';
import photo02 from '../assets/photos/02.jpg?url';
import photo03 from '../assets/photos/03.jpg?url';
import photo04 from '../assets/photos/04.jpg?url';
import photo05 from '../assets/photos/05.jpg?url';
import photo06 from '../assets/photos/06.jpg?url';
import photo07 from '../assets/photos/07.jpg?url';
import photo08 from '../assets/photos/08.jpg?url';
import photo09 from '../assets/photos/09.jpg?url';
import photo10 from '../assets/photos/10.jpg?url';
import photo11 from '../assets/photos/11.jpg?url';
import photo12 from '../assets/photos/12.jpg?url';
import photo13 from '../assets/photos/13.jpg?url';
import photo14 from '../assets/photos/14.jpg?url';
import photo15 from '../assets/photos/15.jpg?url';
import photo16 from '../assets/photos/16.jpg?url';
import photo17 from '../assets/photos/17.jpg?url';
import photo18 from '../assets/photos/18.jpg?url';
import photo19 from '../assets/photos/19.jpg?url';
import photo20 from '../assets/photos/20.jpg?url';
import photo21 from '../assets/photos/21.jpg?url';
import photo22 from '../assets/photos/22.jpg?url';
import photo23 from '../assets/photos/23.jpg?url';
import photo24 from '../assets/photos/24.jpg?url';
import photo25 from '../assets/photos/25.jpg?url';
import photo26 from '../assets/photos/26.jpg?url';
import photo27 from '../assets/photos/27.jpg?url';
import photo28 from '../assets/photos/28.jpg?url';
import photo29 from '../assets/photos/29.jpg?url';
import photo30 from '../assets/photos/30.jpg?url';
import photo31 from '../assets/photos/31.jpg?url';
import photo32 from '../assets/photos/32.jpg?url';
import photo33 from '../assets/photos/33.jpg?url';
import photo34 from '../assets/photos/34.jpg?url';
import photo35 from '../assets/photos/35.jpg?url';
import photo36 from '../assets/photos/36.jpg?url';
import photo37 from '../assets/photos/37.jpg?url';
import photo38 from '../assets/photos/38.jpg?url';
import photo39 from '../assets/photos/39.jpg?url';
import photo40 from '../assets/photos/40.jpg?url';

export interface Photo {
  src: string;
  alt: string;
  title?: string;
  year?: string;
  location?: string;
}

const sources = [
  photo01, photo02, photo03, photo04, photo05,
  photo06, photo07, photo08, photo09, photo10,
  photo11, photo12, photo13, photo14, photo15,
  photo16, photo17, photo18, photo19, photo20,
  photo21, photo22, photo23, photo24, photo25,
  photo26, photo27, photo28, photo29, photo30,
  photo31, photo32, photo33, photo34, photo35,
  photo36, photo37, photo38, photo39, photo40
];

export const photos: Photo[] = sources.map((src, index) => ({
  src,
  alt: `George Array photograph ${String(index + 1).padStart(2, '0')}`,
  title: `Work ${String(index + 1).padStart(2, '0')}`
}));
