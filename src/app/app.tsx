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
    mobile = Cookie.get('azaza_app_mobile') === 'true';

    constructor(props: any) {
        super(props);
        console.warn(this.id);

    }
    render() {
        let type: 'host' | 'client' | 'lendos' | 'wtf' = 'wtf';
        if (this.id) {
            if (this.token && this.clientId && !this.mobile) {
                type = 'host'
            } else if (this.clientId && this.mobile) {
                type = 'client'
            }
        } else {
            type = 'lendos';
        }
        return (
            <>
                {type === 'host' && <Hab />}
                {type === 'client' && <Client />}
                {type === 'lendos' && <Lendos />}
                {type === 'wtf' && 'what are you?'}
            </>
        );
    }
}

ReactDOM.render(
    <Root />,
    document.getElementById("root")
);
