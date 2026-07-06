import { LocaleProvider } from "../lib/LocaleContext";
import "./globals.css";

export const metadata = {
  title: "FindMyDrink — LCBO price and stock tracker",
  description: "Track whisky, wine, and world spirits prices and stock at LCBO. Get notified when your favorite bottle drops in price or comes back in stock.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
