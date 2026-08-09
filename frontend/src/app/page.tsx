import { redirect } from "next/navigation"

// The application always starts from the public Welcome page.
// Authenticated users land on /dashboard once they sign in from there.
export default function RootPage() {
  redirect("/welcome")
}
