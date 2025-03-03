import toast, { Toast, ToastOptions } from 'react-hot-toast';
import { ReactNode } from 'react';

// Default toast options for consistent positioning and behavior
const defaultOptions: ToastOptions = {
  position: 'top-center',
  duration: 3000,
};

// Success toast with green styling
export const success = (message: string, options?: ToastOptions) => {
  return toast.success(message, {
    ...defaultOptions,
    ...options,
    style: {
      borderLeft: '4px solid #10b981', // Green border for success
      ...options?.style,
    },
  });
};

// Error toast with red styling
export const error = (message: string, options?: ToastOptions) => {
  return toast.error(message, {
    ...defaultOptions,
    duration: 4000, // Longer duration for errors
    ...options,
    style: {
      borderLeft: '4px solid #ef4444', // Red border for error
      ...options?.style,
    },
  });
};

// Loading toast
export const loading = (message: string, options?: ToastOptions) => {
  return toast.loading(message, {
    ...defaultOptions,
    duration: Infinity, // Loading toasts stay until dismissed
    ...options,
  });
};

// Promise toast that shows loading, success, and error states
export const promise = <T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string | ((err: any) => string);
  },
  options?: ToastOptions
) => {
  return toast.promise(promise, messages, {
    ...defaultOptions,
    ...options,
  });
};

// Custom toast for flexibility
export const custom = (message: string | ReactNode, options?: ToastOptions) => {
  return toast(message as string, {
    ...defaultOptions,
    ...options,
  });
};

// Export the base toast for advanced usage
export { toast };

// Re-export the dismiss function for convenience
export const dismiss = (toastId?: string | number) => toast.dismiss(toastId as string | undefined); 