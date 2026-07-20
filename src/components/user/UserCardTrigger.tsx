"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { UserCard } from "./UserCard";
import { UserCardSkeleton } from "./UserCardSkeleton";
import { getUserCardData, type UserCardData } from "@/actions/user-card.actions";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

interface UserCardTriggerProps {
  userId: string;
  userData?: UserCardData;
  children: React.ReactNode;
  className?: string;
}

// Module-level cache so repeated opens across the app are instant
const userCardCache = new Map<string, UserCardData>();
const inflightRequests = new Map<string, Promise<UserCardData | null>>();

function fetchUserCard(userId: string): Promise<UserCardData | null> {
  // Return cached data instantly
  if (userCardCache.has(userId)) {
    return Promise.resolve(userCardCache.get(userId)!);
  }

  // Deduplicate in-flight requests for the same user
  if (inflightRequests.has(userId)) {
    return inflightRequests.get(userId)!;
  }

  const req = getUserCardData(userId).then((data) => {
    if (data) userCardCache.set(userId, data);
    inflightRequests.delete(userId);
    return data;
  }).catch((err) => {
    inflightRequests.delete(userId);
    console.error("[UserCardTrigger] fetchUserCard failed for userId:", userId, err);
    throw err;
  });

  inflightRequests.set(userId, req);
  return req;
}

export function UserCardTrigger({ userId, userData, children, className }: UserCardTriggerProps) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<UserCardData | null>(userData || userCardCache.get(userId) || null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const prefetchStarted = useRef(false);

  // Fetch on open if we still don't have data
  useEffect(() => {
    if (open && !data && !isLoading && !hasError && userId) {
      console.log("[UserCardTrigger] Opening dialog, fetching data for userId:", userId);
      setIsLoading(true);
      fetchUserCard(userId)
        .then((fetchedData) => {
          console.log("[UserCardTrigger] fetchUserCard result:", fetchedData ? "data received" : "null returned");
          if (fetchedData) {
            setData(fetchedData);
          } else {
            setHasError(true);
            toast.error("Failed to load user profile");
          }
        })
        .catch((err) => {
          console.error("[UserCardTrigger] fetchUserCard error on open:", err);
          setHasError(true);
          toast.error("Failed to load user profile");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, userId, data, isLoading, hasError]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setHasError(false);
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!userData && !data && !prefetchStarted.current && userId) {
      prefetchStarted.current = true;
      fetchUserCard(userId).then((fetched) => {
        if (fetched) setData(fetched);
      }).catch(() => {
        // Silently fail prefetch
      });
    }
  }, [userId, userData, data]);

  const handleRetry = () => {
    setHasError(false);
    setData(null);
    setIsLoading(true);
    // Remove from cache so we force a fresh fetch
    userCardCache.delete(userId);
    fetchUserCard(userId)
      .then((fetchedData) => {
        if (fetchedData) {
          setData(fetchedData);
        } else {
          setHasError(true);
        }
      })
      .catch(() => setHasError(true))
      .finally(() => setIsLoading(false));
  };

  // If we have pre-fetched data, render UserCard directly
  if (userData) {
    return (
      <UserCard user={userData}>
        <span className={className}>{children}</span>
      </UserCard>
    );
  }

  // Otherwise use Dialog with loading state
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <span
          className={`cursor-pointer inline-block ${className || ""}`}
          onMouseEnter={handleMouseEnter}
          role="button"
          tabIndex={0}
        >
          {children}
        </span>
      </DialogTrigger>
      <DialogContent className="p-0 overflow-hidden max-w-[380px] border-0">
        {isLoading || !data ? (
          <UserCardSkeleton />
        ) : hasError ? (
          <div className="p-6 text-center">
            <p className="text-muted-foreground mb-3">Failed to load profile</p>
            <button 
              onClick={handleRetry}
              className="text-sm text-primary hover:underline"
            >
              Retry
            </button>
          </div>
        ) : (
          <UserCard user={data} isInline>
            <></>
          </UserCard>
        )}
      </DialogContent>
    </Dialog>
  );
}
