import Swal from "sweetalert2";

const useAlert = () => {
  /**
   * Show a confirmation dialog
   * @param {string} title 
   * @param {string} text 
   * @param {string} confirmButtonText -
   * @returns {Promise<boolean>} 
   */
  const confirmAction = async (title, text, confirmButtonText = "Yes, proceed") => {
    const result = await Swal.fire({
      title,
      text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f01c1c", // red
      cancelButtonColor: "#3085d6",
      confirmButtonText,
    });
    return result.isConfirmed;
  };

  /**
   * Show a success message
   * @param {string} message - The success message
   */
  const showSuccess = (message) => {
    Swal.fire({
      title: "Success!",
      text: message,
      icon: "success",
      confirmButtonColor: "#f01c1c", // make OK button red
    });
  };

  /**
   * Show an error message
   * @param {string} message - The error message
   */
  const showError = (message) => {
    Swal.fire({
      title: "Error!",
      text: message,
      icon: "error",
      confirmButtonColor: "#f01c1c", // make OK button red
    });
  };

  return { confirmAction, showSuccess, showError };
};

export default useAlert;
