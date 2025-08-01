import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Phone, CheckCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";

interface QueueStatus {
  departmentId: number;
  departmentName: string;
  currentToken: string;
  waitingCount: number;
  averageWaitTime: number;
  estimatedWaitTime: number;
}

export default function QueueManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch queue status
  const { data: queueStatus, isLoading } = useQuery<QueueStatus[]>({
    queryKey: ["/api/queue/status"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Call next token mutation
  const callNextMutation = useMutation({
    mutationFn: async (departmentId: number) => {
      const response = await apiRequest("POST", "/api/queue/call-next", { departmentId });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Token Called",
        description: `Token ${data.tokenNumber} has been called to consultation room.`,
        variant: "default"
      });
      // Refresh queue status
      queryClient.invalidateQueries({ queryKey: ["/api/queue/status"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to call next token. Please try again.",
        variant: "destructive"
      });
      console.error("Call next token error:", error);
    }
  });

  const canCallNext = (user as User | undefined) && ["front-desk", "doctor", "nurse", "admin"].includes((user as User)?.role || "");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Live Queue Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Live Queue Status</span>
          <Badge variant="outline" className="text-xs">
            Real-time updates
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {queueStatus && queueStatus.length > 0 ? (
            queueStatus.map((queue) => (
              <div
                key={queue.departmentId}
                className={`p-4 rounded-lg border ${
                  queue.waitingCount > 10 
                    ? "bg-red-50 border-red-200" 
                    : queue.waitingCount > 5 
                    ? "bg-orange-50 border-orange-200" 
                    : "bg-green-50 border-green-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                        queue.waitingCount > 10 
                          ? "bg-red-500" 
                          : queue.waitingCount > 5 
                          ? "bg-orange-500" 
                          : "bg-green-500"
                      }`}
                    >
                      {queue.currentToken !== "None" ? queue.currentToken.slice(-3) : "---"}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{queue.departmentName}</p>
                      <p className="text-sm text-gray-600">
                        Current: {queue.currentToken}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center space-x-1 mb-1">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">{queue.waitingCount} waiting</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-xs text-gray-600">
                        ~{queue.estimatedWaitTime} mins
                      </span>
                    </div>
                  </div>
                </div>

                {canCallNext && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <Button
                      onClick={() => callNextMutation.mutate(queue.departmentId)}
                      disabled={callNextMutation.isPending || queue.waitingCount === 0}
                      size="sm"
                      className="w-full"
                    >
                      {callNextMutation.isPending ? (
                        "Calling..."
                      ) : queue.waitingCount === 0 ? (
                        "No patients waiting"
                      ) : (
                        <>
                          <Phone className="h-4 w-4 mr-2" />
                          Call Next Patient
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No active queues at the moment</p>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {queueStatus && queueStatus.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  {queueStatus.reduce((total, queue) => total + queue.waitingCount, 0)}
                </p>
                <p className="text-xs text-gray-600">Total Waiting</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  {queueStatus.length}
                </p>
                <p className="text-xs text-gray-600">Active Departments</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  {Math.round(
                    queueStatus.reduce((total, queue) => total + queue.averageWaitTime, 0) / 
                    queueStatus.length
                  )}
                </p>
                <p className="text-xs text-gray-600">Avg Wait (mins)</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}