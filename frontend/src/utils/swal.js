import Swal from 'sweetalert2';

// Custom theme configuration for SweetAlert2
const swalConfig = {
  customClass: {
    popup: 'dark:bg-slate-800 dark:text-white rounded-3xl border border-gray-100 dark:border-slate-700 shadow-2xl',
    title: 'text-gray-900 dark:text-white font-bold',
    htmlContainer: 'text-gray-600 dark:text-slate-400',
    confirmButton: 'bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all focus:ring-0 mx-2',
    cancelButton: 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 px-6 py-2.5 rounded-xl font-bold transition-all focus:ring-0 mx-2',
    actions: 'gap-3',
  },
  buttonsStyling: false,
};

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: 'rgb(255, 255, 255)',
  color: 'rgb(31, 41, 55)',
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
    
    // Apply dark mode styles for toast
    if (document.documentElement.classList.contains('dark')) {
      toast.style.background = 'rgb(30, 41, 59)';
      toast.style.color = 'white';
    }
  }
});

export const showToast = (icon, title) => {
  Toast.fire({
    icon,
    title
  });
};

export const showAlert = (icon, title, text) => {
  return Swal.fire({
    ...swalConfig,
    icon,
    title,
    text,
  });
};

export const showConfirm = (title, text, confirmText = 'Yes, do it!') => {
  return Swal.fire({
    ...swalConfig,
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: 'Cancel',
    reverseButtons: true
  });
};

export default Swal;
