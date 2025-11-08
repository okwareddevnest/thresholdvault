import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export function formatBtc(satoshis: number | bigint, fractionDigits = 8): string {
  const value =
    typeof satoshis === "bigint"
      ? Number(satoshis) / 100_000_000
      : satoshis / 100_000_000;
  return `${value.toFixed(fractionDigits)} BTC`;
}

export function formatTimestamp(seconds: number | bigint): string {
  const ms =
    typeof seconds === "bigint"
      ? Number(seconds) * 1000
      : Number(seconds) * 1000;
  return dayjs(ms).format("MMM D, YYYY HH:mm");
}

export function distanceFromNow(seconds: number | bigint): string {
  const ms =
    typeof seconds === "bigint"
      ? Number(seconds) * 1000
      : Number(seconds) * 1000;
  return dayjs(ms).fromNow();
}

export function truncateAddress(addr: string, size = 6): string {
  if (addr.length <= size * 2) return addr;
  return `${addr.slice(0, size)}…${addr.slice(-size)}`;
}
