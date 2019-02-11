import * as React from "react";
import * as Cookie from 'js-cookie';
import { QueueSession } from "./model/session";
import { QueueContent } from "../../server/src/model/entity";
import YouTube from "react-youtube";
import { FlexLayout, Button } from "./ui/ui";

export const endpoint = window.location.hostname.indexOf('localhost') >= 0 ? 'http://localhost:5000' : '';

export class Host extends React.PureComponent<{}, { playing?: QueueContent }> {
    id = window.location.pathname.split('/').filter(s => s.length)[0];
    token = Cookie.get('ytb_queue_token_' + (this.id ? this.id.toUpperCase() : ''));
    clientId = Cookie.get('ytb_queue_client');
    session = new QueueSession(this.id, this.token, this.clientId);

    constructor(props: any) {
        super(props);

        if (this.id) {
            this.id = this.id.toUpperCase();
        }

        if (this.token) {
            this.token = this.token.toUpperCase();
        }

        if (this.clientId) {
            this.clientId = this.clientId.toUpperCase();
        }

        console.warn(this.id);

        this.state = {};
    }


    componentDidMount() {
        this.session.onPlayingChange(p => this.setState({ playing: p }))
        // fetch(endpoint + '/next/' + this.id, { method: 'POST' }).then();
    }

    onEnd = () => {
        if (this.state.playing) {
            this.session.next(this.state.playing.queueId);
        }
    }
    render() {

        return (
            <>
                {this.state.playing && <Player onEnd={this.onEnd} id={this.state.playing.id} autoplay={true} />}
                {!this.state.playing && (
                    <FlexLayout style={{ backgroundColor: '#000', height: '100%', flex: 1, fontSize: 90, alignSelf: 'stretch', color: '#fff', fontWeight: 900, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }} >
                        No music to play 🤷‍♂️
                        <br />
                        <Button style={{ border: '14px solid #fff', marginTop: 15, fontSize: 90, fontWeight: 900, color: "#fff", backgroundColor: '#000' }}>
                            📱azaza.app/
                            <span style={{ color: '#7FDBFF' }}>{this.id + ' '}</span>
                        </Button>
                    </FlexLayout>
                )}
            </>
        );

    }
}

export class Player extends React.PureComponent<{ id: string, width?: number, height?: number, onEnd?: () => void, autoplay?: boolean, mute?: boolean }>{
    _onReady = (event) => {
        // access to player in all event handlers via event.target
        if (this.props.autoplay) {
            event.target.playVideo();
        }
    }
    onEnd = () => {
        if (this.props.onEnd) {
            this.props.onEnd();
        }
    }
    render() {
        return (
            <div key={this.props.id} style={{ width: this.props.width || window.innerWidth, height: this.props.height || window.innerHeight }}>
                <YouTube
                    onReady={this._onReady}
                    videoId={this.props.id}
                    opts={{
                        width: (this.props.width || window.innerWidth) + '',
                        height: (this.props.height || window.innerHeight) + '',
                        playerVars: {
                            showinfo: 0,
                            rel: 0,
                            controls: 0,
                            mute: this.props.mute ? 1 : 0,
                            autoplay: this.props.autoplay ? 1 : 0,
                        } as any,
                    }}
                    onEnd={this.onEnd}
                />
            </div>
        );
    }
}