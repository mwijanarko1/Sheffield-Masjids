declare module 'moment-hijri' {
  import moment from 'moment';
  
  interface MomentHijri extends moment.Moment {
    iYear(): number;
    iMonth(): number;
    iDate(): number;
    format(format: string): string;
  }

  interface MomentHijriStatic {
    (date?: string | Date | number, format?: string): MomentHijri;
    (): MomentHijri;
  }

  const momentHijri: MomentHijriStatic;
  export default momentHijri;
}