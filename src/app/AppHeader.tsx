import Image from "next/image";
import Link from "next/link";

type AppPage = "home" | "workspace" | "documentation";

const navItems: Array<{ page: AppPage; label: string; href: string }> = [
 { page: "home", label: "Home", href: "/" },
 { page: "workspace", label: "Workspace", href: "/workspace" },
 { page: "documentation", label: "Documentation", href: "/docs" },
];

export default function AppHeader({ page }: { page: AppPage }) {
 return <header className="app-header koi-header">
  <div className="header-identity">
   <Image className="header-koi" src="/koi.svg" width={48} height={48} alt="" />
   <div>{page === "workspace" ? <h1 className="header-wordmark">Koi charts</h1> : <span className="header-wordmark">Koi charts</span>}
    <p className="header-tagline">Flowcharts through sight, touch, and voice.</p>
   </div>
  </div>
  <nav className="header-navigation" aria-label="Main navigation">
   {navItems.map(item => item.page === page
    ? <span key={item.page} aria-current="page">{item.label}</span>
    : <Link key={item.page} href={item.href}>{item.label}</Link>
   )}
  </nav>
 </header>;
}
