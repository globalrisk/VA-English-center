import { Doodles } from "@/components/layout/Doodles";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { About } from "@/components/marketing/About";
import { Contact } from "@/components/marketing/Contact";
import { Courses } from "@/components/marketing/Courses";
import { Features } from "@/components/marketing/Features";
import { Gallery } from "@/components/marketing/Gallery";
import { Hero } from "@/components/marketing/Hero";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <Doodles />
      <Header isLoggedIn={!!user} />
      <main>
        <Hero />
        <About />
        <Courses />
        <Features />
        <Gallery />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
