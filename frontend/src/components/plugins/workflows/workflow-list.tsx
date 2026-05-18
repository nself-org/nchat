/**
 * Workflow List Component
 * Displays and manages workflows
 */

"use client";

import { Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  useWorkflows,
  useWorkflowExecution,
} from "@/hooks/use-workflows-plugin";
import { useToast } from "@/hooks/use-toast";

interface WorkflowListProps {
  onCreateClick?: () => void;
}

export function WorkflowList({ onCreateClick }: WorkflowListProps) {
  const { workflows, isLoading, error } = useWorkflows();
  const { executeWorkflow, isExecuting } = useWorkflowExecution();
  const { toast } = useToast();

  const handleExecute = async (id: string, name: string) => {
    const result = await executeWorkflow(id);

    if (result) {
      toast({
        title: "Workflow Executed",
        description: `${name} is now running`,
      });
    } else {
      toast({
        title: "Execution Failed",
        description: `Failed to execute ${name}`,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workflows</CardTitle>
          <CardDescription>Loading workflows...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Error Loading Workflows</CardTitle>
          <CardDescription>
            Failed to load workflows. Please try again later.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Workflows</CardTitle>
          <CardDescription>
            Automated workflows for your workspace
          </CardDescription>
        </div>
        {onCreateClick && (
          <Button onClick={onCreateClick}>
            <Plus className="mr-2 h-4 w-4" />
            Create Workflow
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {workflows.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p>No workflows yet</p>
            {onCreateClick && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={onCreateClick}
              >
                Create your first workflow
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Execute</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.map((workflow) => (
                <TableRow key={workflow.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{workflow.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {workflow.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{workflow.trigger.type}</Badge>
                  </TableCell>
                  <TableCell>{workflow.actions.length} actions</TableCell>
                  <TableCell>
                    <Badge variant={workflow.enabled ? "default" : "secondary"}>
                      {workflow.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExecute(workflow.id, workflow.name)}
                      disabled={!workflow.enabled || isExecuting}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Run
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
