'use client';

import { useState, useEffect } from 'react';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Trash2,
  Clock,
  AlertTriangle,
  AlertCircle,
  PackageX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '@/lib/actions/notifications';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import type { Notification as AppNotification } from '@/types';

interface NotificationProps {
  pharmacyId: number;
}

export function Notification({ pharmacyId }: NotificationProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const [notificationsData, unreadCountData] = await Promise.all([
          getNotifications(pharmacyId),
          getUnreadNotificationCount(pharmacyId),
        ]);

        setNotifications(notificationsData as AppNotification[]);
        setUnreadCount(unreadCountData);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [isOpen, pharmacyId]);

  // Poll for new notifications every 5 minutes when not open
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!isOpen) {
        try {
          const count = await getUnreadNotificationCount(pharmacyId);
          setUnreadCount(count);
        } catch (error) {
          console.error('Error polling notifications:', error);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isOpen, pharmacyId]);

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead(pharmacyId);
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true })),
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: number) => {
    try {
      await deleteNotification(notificationId);
      const deletedNotification = notifications.find(
        (n) => n.id === notificationId,
      );
      setNotifications((prev) =>
        prev.filter((notif) => notif.id !== notificationId),
      );

      if (deletedNotification && !deletedNotification.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-50/50"
        >
          <Bell className="h-[1.2rem] w-[1.2rem]" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center min-w-[1.25rem]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-96 p-0 shadow-xl border border-gray-200 rounded-lg backdrop-blur bg-white/95"
        align="end"
        side="bottom"
        sideOffset={8}
      >
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                Notifications
              </CardTitle>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500">
                You have {unreadCount} unread notification
                {unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </CardHeader>

          <Separator />

          <CardContent className="p-0">
            <ScrollArea className="h-80">
              {loading ? (
                <div className="p-4 text-center text-gray-500">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-3">
                    <Bell className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm">You&apos;re all caught up</p>
                  <p className="text-xs text-gray-400 mt-1">
                    No new notifications
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {(() => {
                    const unread = notifications.filter((n) => !n.isRead);
                    const read = notifications.filter((n) => n.isRead);
                    return (
                      <>
                        {unread.length > 0 && (
                          <div>
                            <div className="px-3 py-1.5 text-[11px] font-medium text-gray-500 bg-gray-50">
                              Unread
                            </div>
                            {unread.map((notification) => (
                              <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onMarkAsRead={handleMarkAsRead}
                                onDelete={handleDeleteNotification}
                                onClose={() => setIsOpen(false)}
                              />
                            ))}
                          </div>
                        )}
                        {read.length > 0 && (
                          <div>
                            {unread.length > 0 && (
                              <div className="px-3 py-1.5 text-[11px] font-medium text-gray-500 bg-gray-50">
                                Earlier
                              </div>
                            )}
                            {read.map((notification) => (
                              <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onMarkAsRead={handleMarkAsRead}
                                onDelete={handleDeleteNotification}
                                onClose={() => setIsOpen(false)}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </ScrollArea>
          </CardContent>
          {false && <div />}
        </Card>
      </PopoverContent>
    </Popover>
  );
}

interface NotificationItemProps {
  notification: AppNotification;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onClose,
}: NotificationItemProps) {
  const router = useRouter();
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'LOW_STOCK':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'OUT_OF_STOCK':
        return <PackageX className="h-4 w-4 text-gray-600" />;
      case 'EXPIRING':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'EXPIRED':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'LOW_STOCK':
        return 'border-l-orange-500 bg-orange-50/30';
      case 'OUT_OF_STOCK':
        return 'border-l-gray-500 bg-gray-50/50';
      case 'EXPIRING':
        return 'border-l-yellow-500 bg-yellow-50/30';
      case 'EXPIRED':
        return 'border-l-red-500 bg-red-50/30';
      default:
        return 'border-l-blue-500 bg-blue-50/30';
    }
  };

  return (
    <div
      className={`group relative p-3 hover:bg-gray-50 transition-colors border-l-4 ${
        !notification.isRead
          ? getNotificationColor(notification.type)
          : 'border-l-gray-200'
      } rounded-none`}
      onClick={async () => {
        if (!notification.isRead) {
          // Optimistically mark as read via parent handler
          await onMarkAsRead(notification.id);
        }
        let href = '/reports/inventory?tab=overview';
        if (
          notification.type === 'LOW_STOCK' ||
          notification.type === 'OUT_OF_STOCK'
        ) {
          const status =
            notification.type === 'OUT_OF_STOCK' ? 'out_of_stock' : 'low';
          href = `/reports/inventory?tab=low-stock&status=${status}`;
        } else if (
          notification.type === 'EXPIRING' ||
          notification.type === 'EXPIRED'
        ) {
          const status =
            notification.type === 'EXPIRED' ? 'expired' : 'expiring';
          href = `/reports/inventory?tab=expiring&status=${status}`;
        }
        onClose();
        router.push(href);
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <div className="h-7 w-7 rounded-full bg-white shadow ring-1 ring-gray-200 grid place-items-center">
            {getNotificationIcon(notification.type)}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p
                className={`text-[13px] leading-snug ${
                  !notification.isRead ? 'font-medium' : 'font-normal'
                } text-gray-900`}
              >
                {notification.message}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                {formatDistanceToNow(new Date(notification.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>

            <div className="flex items-center gap-1">
              {!notification.isRead && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(notification.id);
                  }}
                  className="h-6 w-6 text-gray-400 hover:text-blue-600"
                  title="Mark as read"
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification.id);
                }}
                className="h-6 w-6 text-gray-400 hover:text-red-600"
                title="Delete notification"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      {!notification.isRead && (
        <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-blue-500" />
      )}
    </div>
  );
}
