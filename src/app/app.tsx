import * as React from "react";
import * as ReactDOM from "react-dom";
import { Host as Hab } from "./Host";
import { Route } from "react-router";
import * as Cookie from 'js-cookie';
import { Client } from "./Client";

export const isChromium = (window as any).chrome;

export class Root extends React.PureComponent {
    id = window.location.pathname.split('/').filter(s => s.length)[0];
    token = Cookie.get('ytb_queue_token_' + this.id);
    clientId = Cookie.get('ytb_queue_client');
    render() {
        return (
            <>
                {this.token && <Hab />}
                {!this.token && this.clientId && <Client />}
                {!this.token && !this.clientId && 'what are you?'}
            </>
        );
    }
}

ReactDOM.render(
    <Root />,
    document.getElementById("root")
);
