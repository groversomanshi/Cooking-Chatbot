import Link from "next/link";
import { Stack, Typography } from "@mui/material";
import LoginForm from "@/components/auth/LoginForm";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

export default function LoginPage() {
  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography variant="h4" sx={{ fontWeight: 600, letterSpacing: "-0.02em" }}>
          Welcome back
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Log in to pick up where you left off.
        </Typography>
      </Stack>

      <LoginForm />

      <GoogleSignInButton />

      <Typography variant="body2" color="text.secondary" align="center">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          style={{ color: "inherit", fontWeight: 500, textDecoration: "underline" }}
        >
          Sign up
        </Link>
      </Typography>
    </Stack>
  );
}
