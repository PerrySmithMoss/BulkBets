import Link from "next/link";

interface Props {}

export const Logo: React.FC<Props> = ({}) => {
  return (
    <Link href="/" className="flex items-center gap-2 font-bold text-2xl">
      <p>
        Bulk
        <span className="text-primary">Bets</span>
      </p>
      <span className="sr-only">Bulk Bets</span>
    </Link>
  );
};
