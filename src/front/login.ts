import { documentReady } from "./utils.js";

documentReady().then(() => {
    $("#form-login").on("submit", async function(e) {
        e.preventDefault();
        let formData = new FormData($(this).get(0) as HTMLFormElement);
        let entries = {
            "User": formData.get("User"),
            "Password": formData.get("Password")
        };

        let fetchRequest = await fetch("/login", {
            method: "post",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(entries)
        });
        let data = await fetchRequest.text();
        console.log(data);
    });
});