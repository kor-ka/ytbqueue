import * as React from "react";
import { QueueContent } from "../../server/src/model/entity";
import { FlexLayout } from "./ui/ui";
import { default as Twemoji } from 'react-twemoji';
import * as Cookie from 'js-cookie';

export const endpoint = window.location.hostname.indexOf('localhost') >= 0 ? 'http://localhost:5000' : '';

let session = Cookie.get('azaza_app_suggested_session');


export class Lendos extends React.PureComponent {

    render() {
        return (

            <FlexLayout style={{ height: '100%', flex: 1, alignSelf: 'stretch', fontWeight: 100, alignItems: 'center', justifyContent: 'center', textAlign: 'center', }} >
                <span style={{ color: '#555', position: 'absolute', fontSize: 40, top: '10vmin', width: '100%', left: 0 }}>Collective playlists service</span>
                <a href={'/' + session} style={{ textDecoration: 'none' }} >
                    <FlexLayout style={{ border: '2px solid #000', marginTop: '3vmin', borderRadius: '2vmin', padding: '0.3vmin', paddingBottom: '1vmin', paddingLeft: '2vmin', paddingRight: '2vmin', fontSize: 60, fontWeight: 100, color: "#000", }}>
                        <Twemoji>Start</Twemoji>
                    </FlexLayout>
                </a>

            </FlexLayout>
        );

    }
}