import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "../src/components/AuthProvider";
import TopNav from "../src/components/TopNav";

export const metadata: Metadata = {
    title: "Univer Timetable",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ru">
        <body>
        <AuthProvider>
            <div className="container">
                <TopNav />
                {children}
            </div>
        </AuthProvider>
        </body>
        </html>
    );
}