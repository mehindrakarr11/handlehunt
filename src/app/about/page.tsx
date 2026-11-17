import type { Metadata } from "next";
import { ArrowUpRight, BadgeCheck, BrainCircuit, CircleAlert, LockKeyhole, Search } from "lucide-react";
export const metadata: Metadata = { title: "How verification works" };

export default function AboutPage() {
  return (
    <main className="main-wrap space-y-8 pb-20">
      <div className="max-w-3xl space-y-5 pt-9">
        <span className="eyebrow"><Search size={13}/> ABOUT THE PRODUCT</span>
        <h1 className="heading-large">Discovery is automated.<br/><span className="gradient-text">Claimability is not.</span></h1>
        <p className="lead">HandleHunt generates and ranks username candidates, but it does not query Instagram to determine whether an account name can be registered.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <div className="info-panel"><BrainCircuit className="mb-5 text-purple-300"/><h2>01. Generate</h2><p>Find 3–6 letter dictionary and invented names using local algorithms. Brand scores reflect aesthetics only.</p></div>
        <div className="info-panel"><Search className="mb-5 text-purple-300"/><h2>02. Check manually</h2><p>Go to Instagram, edit your username, and enter a candidate. A missing public profile is not proof of availability.</p></div>
        <div className="info-panel"><BadgeCheck className="mb-5 text-purple-300"/><h2>03. Record evidence</h2><p>Save what you saw and when. A name that appeared claimable may become unavailable at any time.</p></div>
      </div>
      <section className="surface-card max-w-4xl p-7 md:p-9 space-y-5">
        <div className="flex gap-3"><CircleAlert className="mt-1 text-amber-300 shrink-0"/><div><h2 className="text-lg font-semibold text-white">What the statuses actually mean</h2><p className="muted-copy mt-2">Unverified: never checked. Appeared claimable: manually reported possible in Instagram’s editor. Not claimable: Instagram did not allow it at the time. Claimed by me: you say you successfully set it on your own account. None is a guarantee for other users.</p></div></div>
        <div className="line"/>
        <div className="flex gap-3"><LockKeyhole className="mt-1 text-purple-300 shrink-0"/><div><h2 className="text-lg font-semibold text-white">Privacy and platform compliance</h2><p className="muted-copy mt-2">Your saved list and manual check notes live in this browser’s localStorage. No Instagram password, cookie, session token, scraper, bulk account probing, proxy rotation, or automated account creation is used.</p></div></div>
        <a href="https://www.instagram.com/accounts/edit/" target="_blank" rel="noopener noreferrer" className="primary-button inline-flex">Open Instagram settings <ArrowUpRight size={16}/></a>
      </section>
    </main>
  );
}
