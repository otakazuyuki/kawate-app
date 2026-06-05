import GlobalNav from "@/components/GlobalNav";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}){
  return (
    <html lang="ja">
      <body className="bg-slate-950 text-slate-50 min-h-screen">
        <GlobalNav />
        <main className="pt-0 pb-16 md:pt-16 md:pb-0 min-h-screen">{children}</main>
      </body>
    </html>
  )
}
