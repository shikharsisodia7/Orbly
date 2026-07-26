import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { ScrollStory } from "@/components/marketing/ScrollStory";
import { QueueDemoSection } from "@/components/marketing/QueueDemoSection";
import { PrivacySection } from "@/components/marketing/PrivacySection";
import { Faq } from "@/components/marketing/Faq";
import { FinalCta } from "@/components/marketing/FinalCta";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <ScrollStory />
      <QueueDemoSection />
      <PrivacySection />
      <Faq />
      <FinalCta />
    </>
  );
}
