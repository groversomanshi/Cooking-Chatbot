import Link from "next/link";
import { Stack, Typography } from "@mui/material";
import SignupForm from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography variant="h4" sx={{ fontWeight: 600, letterSpacing: "-0.02em" }}>
          Create account
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Start building your recipe collection.
        </Typography>
      </Stack>

      <SignupForm />

      <Typography variant="body2" color="text.secondary" align="center">
        Already have an account?{" "}
        <Link
          href="/login"
          style={{ color: "inherit", fontWeight: 500, textDecoration: "underline" }}
        >
          Log in
        </Link>
      </Typography>
    </Stack>
  );
}
