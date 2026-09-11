import Image from "next/image";
import Link from "next/link";

export default function AppHeader({ page }: { page: "workspace" | "documentation" }) {
 return <header className="app-header koi-header">
  <div className="header-identity">
   <Image className="header-koi" src="/koi.svg" width={48} height={48} alt="" />
   <div>{page === "workspace" ? <h1 className="header-wordmark">Koi charts</h1> : <span className="header-wordmark">Koi charts</span>}
    <p className="header-tagline">Flowcharts through sight, touch, and voice.</p>
   </div>
   <span className="header-preview">Preview</span>
  </div>
  <nav className="header-navigation" aria-label="Main navigation">
   {page === "workspace" ? <span aria-current="page">Workspace</span> : <Link href="/">Workspace</Link>}
   {page === "documentation" ? <span aria-current="page">Documentation</span> : <Link href="/docs" target="_blank" rel="noopener noreferrer" title="Open documentation in a new tab">Documentation<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M9 3h4v4M13 3 7 9M6 3H3v10h10v-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg></Link>}
  </nav>
 </header>;
}
