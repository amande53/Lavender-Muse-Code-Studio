"use client";

import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  useAuth,
  UserButton
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Authenticated,
  AuthLoading,
  ConvexReactClient,
  Unauthenticated
} from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ThemeProvider } from "next-themes";
import { UnauthenticatedView } from "@/src/features/auth/components/unauthenticated-view";
import { AuthLoadingView } from "@/src/features/auth/components/auth-loading-view";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk
        client={convex}
        useAuth={useAuth}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Authenticated>
            <UserButton />
            {children}
          </Authenticated>
          <Unauthenticated>
                <UnauthenticatedView />
          </Unauthenticated>
          <AuthLoading>
            <AuthLoadingView />
          </AuthLoading>
        </ThemeProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
};
