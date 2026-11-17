"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Bookmark, ScanLine, Sparkles } from "lucide-react";
export default function Home() {
  const reduce = useReducedMotion();
  return (
    <main className="main-wrap pb-20">
      <section className="landing-hero">
        <div className="hero-glow" aria-hidden="true" />
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          <span className="eyebrow">A SMALL NAME. A BIG FIRST IMPRESSION.</span>
          <h1 className="heading-large mt-6">
            Find a handle
            <br />
            that feels <span className="gradient-text">like you.</span>
          </h1>
          <p className="lead max-w-xl mt-6">
            Explore memorable words, distinctive inventions and clean
            combinations. Build your collection, then verify your favourites
            directly on Instagram.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link href="/discover" className="primary-button">
              Open discovery studio <ArrowUpRight size={18} />
            </Link>
            <Link href="/login" className="secondary-button">
              Your workspace
            </Link>
          </div>
          <p className="field-hint mt-5">
            No Instagram credentials. No automated availability claims.
          </p>
        </motion.div>
        <div className="landing-orbit" aria-hidden="true">
          <span>@</span>
          <p>@lumen</p>
          <p>@aevyn</p>
          <p>@your.next</p>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: Sparkles,
            n: "01",
            title: "Explore with intention",
            text: "Choose 2–10 characters, eight styles and precise filters. Scores measure creative quality, never availability.",
          },
          {
            icon: Bookmark,
            n: "02",
            title: "Keep the good ones",
            text: "Save, search and export your shortlist. Connect your HandleHunt account for a private cloud collection.",
          },
          {
            icon: ScanLine,
            n: "03",
            title: "Verify at the source",
            text: "Try the name in Instagram’s official username field. Record your observation with a timestamp and history.",
          },
        ].map(({ icon: Icon, n, title, text }) => (
          <article className="surface-card p-7" key={n}>
            <div className="flex justify-between text-purple-300">
              <Icon size={23} />
              <span>{n}</span>
            </div>
            <h2 className="mt-7 text-xl font-semibold">{title}</h2>
            <p className="mt-3 text-sm leading-7 text-[#999db4]">{text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
