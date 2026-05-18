import { Metadata } from "next";
import {
  VercelDeployButton,
  DeploymentStatusChecker,
} from "@/components/admin/deployment";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = {
  title: "Deployment | Admin",
  description: "Deploy and monitor your nchat instance",
};

export default function DeploymentPage() {
  return (
    <div className="container mx-auto space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Deployment</h1>
        <p className="text-muted-foreground">
          Deploy your nchat instance to Vercel and monitor service health
        </p>
      </div>

      <Tabs defaultValue="deploy" className="space-y-4">
        <TabsList>
          <TabsTrigger value="deploy">Deploy to Vercel</TabsTrigger>
          <TabsTrigger value="status">Deployment Status</TabsTrigger>
        </TabsList>

        <TabsContent value="deploy" className="space-y-4">
          <VercelDeployButton />
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <DeploymentStatusChecker />
        </TabsContent>
      </Tabs>
    </div>
  );
}
