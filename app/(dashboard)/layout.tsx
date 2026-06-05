import GlobalNav from "@/components/GlobalNav";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}){
    return (
        <>
            <GlobalNav />
            <main className="pt-0 pb-16 md:pt-16 md:pb-0 min-h-screen">{children}</main>
        </>
    );
};