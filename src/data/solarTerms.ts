/**
 * 24절기 근사 날짜 데이터 (양력 기준, "MM-DD").
 *
 * MVP NOTICE: 절기의 실제 시각은 해마다 몇 시간~하루 정도 앞뒤로 달라진다.
 * 여기서는 각 절기의 평균적인 양력 날짜만 사용하는 간략 구현이며, 연주(年柱)
 * 경계(입춘) 판정에만 근사치로 사용한다. 정식 서비스 전환 전 연도별 정밀
 * 절기 시각 DB로 교체해야 한다.
 */
export const SOLAR_TERMS: { name: string; date: string }[] = [
  { name: "소한", date: "01-06" },
  { name: "대한", date: "01-20" },
  { name: "입춘", date: "02-04" },
  { name: "우수", date: "02-19" },
  { name: "경칩", date: "03-06" },
  { name: "춘분", date: "03-21" },
  { name: "청명", date: "04-05" },
  { name: "곡우", date: "04-20" },
  { name: "입하", date: "05-06" },
  { name: "소만", date: "05-21" },
  { name: "망종", date: "06-06" },
  { name: "하지", date: "06-21" },
  { name: "소서", date: "07-07" },
  { name: "대서", date: "07-23" },
  { name: "입추", date: "08-08" },
  { name: "처서", date: "08-23" },
  { name: "백로", date: "09-08" },
  { name: "추분", date: "09-23" },
  { name: "한로", date: "10-08" },
  { name: "상강", date: "10-24" },
  { name: "입동", date: "11-07" },
  { name: "소설", date: "11-22" },
  { name: "대설", date: "12-07" },
  { name: "동지", date: "12-22" },
];

/** 연주(年柱) 경계로 사용하는 입춘 근사 날짜 ("MM-DD") */
export const IPCHUN_APPROX = "02-04";
