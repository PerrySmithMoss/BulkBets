import { Metadata } from "next";
import Link from "next/link";

import { X } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RegisterUserForm } from "./components/register-user-form";
import { Logo } from "@/components/logo";
import { PersonalInfoForm } from "./components/personal-info-form";

export const metadata: Metadata = {
  title: "BulkBets - Join us",
  description: "Join us now at BulkBets.",
};

export default function Page() {
  return (
    <div className="container h-screen lg:max-w-none lg:px-0">
      <div className="items-center justify-between flex w-full pt-4">
        <div className="pl-8">
          <Logo />
        </div>
        <div className="pr-6">
          <Link href="/">
            <X />
          </Link>
        </div>
      </div>
      <div className="mt-10">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6">
          <h1 className="text-3xl font-bold tracking-tight text-center">
            Join us
          </h1>
          <div className="mx-auto">
            <Tabs defaultValue={tabs[0].id}>
              <TabsList>
                {tabs.map((tab) => (
                  <TabsTrigger className="px-10" key={tab.id} value={tab.id}>
                    {tab.title}
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className="mt-4 max-w-[550px]">
                {tabs.map((tab) => (
                  <TabsContent key={tab.id} value={tab.id}>
                    {tab.content}
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

const tabs = [
  {
    id: "1",
    title: "1. Personal Info",
    content: <PersonalInfoForm />,
  },
  {
    id: "2",
    title: "2. Address",
    content: <RegisterUserForm />,
  },
  {
    id: "3",
    title: "3. Login Details",
    content: <RegisterUserForm />,
  },
];
