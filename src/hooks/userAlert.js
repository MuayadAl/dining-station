import Swal from "sweetalert2";

const useAlert = () => {
    /**
     * Show a confirmation dialog
     * @param {string} title - The alert title
     * @param {string} text - The alert message
     * @param {string} confirmButtonText - Confirm button text
     * @returns {Promise<boolean>} Resolves `true` if confirmed, `false` if canceled
     */
    const confirmAction = async (title, text, confirmButtonText = "Yes, proceed") => {
        const result = await Swal.fire({
            title,
            text,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#f01c1c",
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
            icon: "success"
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
            icon: "error"
        });
    };

    return { confirmAction, showSuccess, showError };
};

export default useAlert;
