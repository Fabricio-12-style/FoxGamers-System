const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");

if (togglePassword && passwordInput) {
  togglePassword.addEventListener("click", () => {
    const type =
      passwordInput.getAttribute("type") === "password" ? "text" : "password";
    passwordInput.setAttribute("type", type);
    togglePassword.classList.toggle("bi-eye");
    togglePassword.classList.toggle("bi-eye-slash");

    if (type === "text") {
      togglePassword.style.color = "var(--fox-glow-blue)";
    } else {
      togglePassword.style.color = "";
    }
  });
}

const btnIngresar = document.getElementById("btnIngresar");

if (btnIngresar) {
  btnIngresar.addEventListener("click", async () => {
    const form = document.querySelector(".needs-validation");

    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }

    const usuario = document.getElementById("username").value;
    const password = passwordInput.value;

    try {
      const respuesta = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ usuario, password }),
      });

      const data = await respuesta.json();

      if (data.success) {
        localStorage.setItem("usuarioFoxGamers", JSON.stringify(data.user));
        localStorage.setItem("tokenFoxGamers", data.token);

        Swal.fire({
          title: data.mensaje,
          text: "Accediendo al sistema...",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
          heightAuto: false,
          backdrop: true,
        }).then(() => {
          window.location.href = "../dashboard/dashboard.html";
        });
      } else {
        if (respuesta.status === 403) {
          Swal.fire({
            title: "Cuenta Bloqueada",
            text: data.mensaje,
            icon: "warning",
            confirmButtonColor: "#f39c12",
            heightAuto: false,
            backdrop: true,
          });
        } else {
          Swal.fire({
            title: "Acceso Denegado",
            text: data.mensaje,
            icon: "error",
            confirmButtonColor: "#dc3545",
            heightAuto: false,
            backdrop: true,
          });
        }
      }
    } catch (error) {
      console.error("Error en la conexión:", error);
      Swal.fire({
        title: "Sin conexión",
        text: "No se pudo conectar con el servidor de FOX GAMERS. Verifica que el backend esté corriendo.",
        icon: "warning",
        confirmButtonColor: "#ffc107",
        heightAuto: false,
        backdrop: true,
      });
    }
  });
}