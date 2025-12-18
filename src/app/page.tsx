import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { LandingPage } from "@/components/marketing/LandingPage";

export default function Home() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <LandingPage />
      <MarketingFooter />
    </div>
  );
}
