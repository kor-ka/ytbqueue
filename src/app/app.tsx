import * as React from "react";
import * as ReactDOM from "react-dom";
import { Host as Hab } from "./Host";
import { Route } from "react-router";
import * as Cookie from 'js-cookie';
import { Client } from "./Client";
import { Prompt } from "./Prompt";
import { Lendos } from "./Lendos";

export const isChromium = (window as any).chrome;

export class Root extends React.PureComponent {
    id = window.location.pathname.split('/').filter(s => s.length)[0];
    token = Cookie.get('azaza_app_host_' + (this.id ? this.id.toUpperCase() : ''));
    clientId = Cookie.get('azaza_app_client');

    constructor(props: any) {
        super(props);
        console.warn(this.id);

    }
    render() {
        return (
            <>
                {this.id && this.token && <Hab />}
                {this.id && !this.token && this.clientId && <Client />}
                {this.id && !this.token && !this.clientId && 'what are you?'}
                {!this.id && <Lendos />}
            </>
        );
    }
}

ReactDOM.render(
    <Root />,
    document.getElementById("root")
);
