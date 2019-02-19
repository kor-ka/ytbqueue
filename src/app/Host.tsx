import * as React from "react";
import * as Cookie from 'js-cookie';
import { QueueSession } from "./model/session";
import { QueueContent } from "../../server/src/model/entity";
import YouTube from "react-youtube";
import { FlexLayout, Button } from "./ui/ui";
import { default as Twemoji } from 'react-twemoji';

export const endpoint = window.location.hostname.indexOf('localhost') >= 0 ? 'http://localhost:5000' : '';

export class Host extends React.PureComponent<{}, { playing?: QueueContent, q?: { queue: QueueContent[], inited: boolean } }> {
    session = new QueueSession();

    constructor(props: any) {
        super(props);

        this.state = {};
    }


    componentDidMount() {
        this.session.onPlayingChange(p => this.setState({ playing: p }))
        this.session.onQueueChange(q => this.setState({ q: q }))
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
                        < Twemoji >{(this.state.q && this.state.q.inited) ? (this.state.q.queue.length === 0 ? 'No music to play 🤷‍♂️' : '') : 'Connecting... 🙌'}</Twemoji>
                        <br />
                        {this.state.q && this.state.q.queue.length === 0 && <Button style={{ border: '14px solid #fff', marginTop: 15, fontSize: 90, fontWeight: 900, color: "#fff", backgroundColor: '#000' }}>
                            <Twemoji>📱azaza.app/<span style={{ color: '#7FDBFF' }}>{this.session.id + ' '}</span></Twemoji>
                        </Button>}
                    </FlexLayout>
                )
                }
                {this.state.playing && (
                    <FlexLayout style={{ position: 'absolute', bottom: 20, left: 20, opacity: 0.4 }}>
                        <Button style={{ fontWeight: 900, color: "#fff", backgroundColor: '#000', fontSize: 90 }}>
                            <Twemoji>📱azaza.app/<span style={{ color: '#7FDBFF' }}>{this.session.id + ' '}</span></Twemoji>
                        </Button>
                    </FlexLayout>
                )}
            </>
        );

    }
}

export class Player extends React.PureComponent<{ id: string, width?: number, height?: number, onEnd?: () => void, autoplay?: boolean, mute?: boolean }, { width: number, height: number }>{
    constructor(props: any) {
        super(props);
        this.state = { width: 1, height: 2 };
    }
    mounted = false;
    time = 0;
    playerInner?: any;
    updateDimensions = () => {
        this.setState({ width: window.innerWidth, height: window.innerHeight });
    }
    componentWillUnmount() {
        window.removeEventListener("resize", this.updateDimensions);
        this.mounted = false;
    }
    componentDidMount() {
        window.addEventListener("resize", this.updateDimensions);
        this.mounted = true;
    }

    _onReady = (event) => {
        // access to player in all event handlers via event.target
        if (this.props.autoplay) {
            event.target.playVideo();
        }
    }
    onChange = (event: { target: { getCurrentTime: () => any, seekTo: (time: number) => void }, data: number }) => {
        console.warn(event);
        this.playerInner = event.target;
        if (this.time > event.target.getCurrentTime()) {
            event.target.seekTo(this.time);
        }
        this.checkTime();
    }
    checkTime = () => {
        setTimeout(() => {
            if (!this.mounted) {
                return;
            }
            if (this.playerInner) {
                this.time = this.playerInner.getCurrentTime();
            }
            this.checkTime();
        }, 100)

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
                    onStateChange={this.onChange}
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
                    onError={this.onEnd}
                />
            </div>
        );
    }
}