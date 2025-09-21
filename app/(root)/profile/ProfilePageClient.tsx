"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon, Lock } from "lucide-react";
import ProfilePasswordForm from "@/components/ProfilePasswordForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import React from "react";
import { toast } from "sonner";

type ProfilePageClientProps = {
  name: string;
  email: string;
  initials: string;
  saveProfile: (
    formData: FormData
  ) => Promise<{ ok: boolean; message: string }> | Promise<void> | void;
  changePassword: (
    formData: FormData
  ) => Promise<{ ok: boolean; message: string }> | Promise<void> | void;
};

export default function ProfilePageClient({
  name,
  email,
  initials,
  saveProfile,
  changePassword,
}: ProfilePageClientProps) {
  const [infoPending, setInfoPending] = React.useState(false);

  async function onSaveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (infoPending) return;
    setInfoPending(true);
    const formData = new FormData(e.currentTarget);
    try {
      const res = (await saveProfile(formData)) as {
        ok?: boolean;
        message?: string;
      } | void;
      if (res && typeof res === "object" && "ok" in res && res.ok) {
        toast.success(res.message || "Profile updated");
      } else if (res && typeof res === "object" && "ok" in res && !res.ok) {
        toast.error(res.message || "Update failed");
      } else {
        toast.success("Profile updated");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setInfoPending(false);
    }
  }
  return (
    <div className="px-6 py-6 space-y-6 max-w-2xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-50 text-blue-600 p-2">
          <UserIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold leading-tight">
            Manage Profile
          </h1>
          <p className="text-sm text-muted-foreground">
            Update your account details and change your password.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 items-stretch">
        {/* Profile info */}
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base">Profile Information</CardTitle>
              </div>
              <Avatar className="h-8 w-8 border border-gray-200/70">
                <AvatarImage src="" />
                <AvatarFallback className="bg-gray-100 text-gray-700 text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This will be visible on receipts and activity logs.
            </p>
          </CardHeader>
          <CardContent className="flex-1">
            <form onSubmit={onSaveProfile} className="grid gap-3 w-full">
              <div className="grid gap-1">
                <label className="text-sm font-medium">Full name</label>
                <Input
                  name="fullName"
                  defaultValue={name}
                  required
                  placeholder="Juan Dela Cruz"
                  className="w-full"
                  pattern="^[A-Za-z\s]+$"
                  title="Name must contain only letters and spaces"
                />
              </div>
              <div className="grid gap-1">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  name="email"
                  defaultValue={email}
                  required
                  placeholder="you@example.com"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Changing your email will change how you sign in.
                </p>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={infoPending}>
                  {infoPending ? "Saving…" : "Save"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Password */}
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Password</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Use a strong password you don’t reuse elsewhere.
            </p>
          </CardHeader>
          <CardContent className="flex-1">
            <ProfilePasswordForm action={changePassword} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
