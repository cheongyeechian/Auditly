import HomeClient from "@/components/HomeClient";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient";

type Status = "pass" | "warn" | "fail";
type Indicators = {
  verifiedSource: Status;
  proxy: Status;
  ownerPrivileges: Status;
  dangerousFunctions: Status;
  liquidity: Status;
  holderDistribution: Status;
};

export default function Home() {
  return (
    <BackgroundGradientAnimation containerClassName="min-h-screen w-full" className="px-4 py-10">
      <HomeClient />
    </BackgroundGradientAnimation>
  );
}
