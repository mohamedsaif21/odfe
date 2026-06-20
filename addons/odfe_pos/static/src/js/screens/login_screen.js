import { Component, useState } from "@odoo/owl";

export class LoginScreen extends Component {
    static template = "odfe_pos.LoginScreen";
    static props = {
        onLogin: { type: Function },
    };

    setup() {
        this.state = useState({
            username: "",
            password: "",
            error: "",
        });
    }

    async handleLogin() {
        if (!this.state.username || !this.state.password) {
            this.state.error = "Please enter username and password";
            return;
        }
        this.state.error = "";
        try {
            const result = await fetch("/web/session/authenticate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    params: {
                        login: this.state.username,
                        password: this.state.password,
                        db: "",
                    },
                }),
            });
            const data = await result.json();
            if (data.result && data.result.uid) {
                this.props.onLogin(data.result);
            } else {
                this.state.error = "Invalid credentials";
            }
        } catch (e) {
            this.state.error = "Connection error";
        }
    }
}
