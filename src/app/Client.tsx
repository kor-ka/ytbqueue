import * as React from "react";
import * as Cookie from 'js-cookie';
import { QueueSession } from "./model/session";
import { QueueContent, Content } from "../../server/src/model/entity";
import { FlexLayout, Input, Button } from "./ui/ui";
import * as youtubeSearch from "youtube-search";
import { Player } from "./Host";


export const endpoint = window.location.hostname.indexOf('localhost') >= 0 ? 'http://localhost:5000' : '';

export class Client extends React.PureComponent<{}, { playing?: QueueContent, queue: QueueContent[], mode: 'queue' | 'search' }> {
    constructor(props: any) {
        super(props);
        this.state = { queue: [], mode: 'queue' };
    }
    id = window.location.pathname.split('/').filter(s => s.length)[0];
    token = Cookie.get('ytb_queue_token_' + this.id);
    clientId = Cookie.get('ytb_queue_client');
    session = new QueueSession(this.id, this.token, this.clientId);
    componentDidMount() {
        this.session.onPlayingChange(p => this.setState({ playing: p }))
        this.session.onQueueChange(q => this.setState({ queue: q }))
        // fetch(endpoint + '/next/' + this.id, { method: 'POST' }).then();
    }

    toSearch = () => {
        this.setState({ mode: 'search' });
    }

    toQueue = () => {
        this.setState({ mode: 'queue' });
    }

    render() {
        return (
            <>
                <div style={{ display: this.state.mode === 'queue' ? undefined : 'none' }}>
                    <QueuePage toSearch={this.toSearch} playing={this.state.playing} queue={this.state.queue} session={this.session} />
                </div>
                {this.state.mode === 'search' && <Searcher toQueue={this.toQueue} session={this.session} />}
            </>
        )
    }
}

export class QueuePage extends React.PureComponent<{ playing?: QueueContent, queue: QueueContent[], session: QueueSession, toSearch: () => void }> {
    toSearch = () => {
        this.props.toSearch();
    }

    render() {
        return (
            <FlexLayout style={{ flexDirection: 'column', alignItems: 'stretch', marginTop: 0, height: '100%', width: '100%', overflowX: 'hidden', backgroundColor: 'rgba(249,249,249,1)' }}>
                {this.props.playing && <Player height={200} id={this.props.playing.id} />}
                {!this.props.playing && (
                    <FlexLayout style={{ backgroundColor: '#000', height: 200, alignSelf: 'stretch', color: '#fff', fontWeight: 900, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }} >
                        No music to play 🤷‍♂️
                    <Button onClick={this.toSearch} style={{ border: '5px solid #fff', marginTop: 15, fontSize: 30, fontWeight: 900, color: "#fff", backgroundColor: '#000' }}>Start party 🎉</Button>
                    </FlexLayout>
                )}
                <Queue queue={this.props.queue} />

                <Button onClick={this.toSearch} style={{ borderRadius: 0, backgroundColor: '#000', alignSelf: 'stretch', fontSize: 30, fontWeight: 900, color: "#fff" }}>Add something cool 😎</Button>
            </FlexLayout>
        );
    }
}

export class Queue extends React.PureComponent<{ queue: QueueContent[] }> {
    render() {
        return (
            <FlexLayout style={{ flexGrow: 1, flexDirection: 'row' }}>
                {this.props.queue.map(c => (
                    <>
                        <ContentItem content={c} subtitle={c.user.name} />
                        {/* <FlexLayout style={{ flexDirection: 'column', width: 50, position: 'absolute', right: 0, marginTop: -10 }}>
                            <Button style={{ backgroundColor: 'transparent', height: 20 }}>🤘</Button>
                            <Button style={{ backgroundColor: 'transparent', height: 20 }}>👎</Button>
                        </FlexLayout> */}
                    </>
                ))}
            </FlexLayout>
        );
    }
}

export class Searcher extends React.PureComponent<{ session: QueueSession, toQueue: () => void }, { q: string, results: Content[] }>{
    constructor(props: any) {
        super(props);
        this.state = { q: '', results: [] };
    }
    generation = 0;

    toQueue = () => {
        this.props.toQueue();
    }

    onInputChange = (event: React.FormEvent<HTMLInputElement>) => {
        let q = event.currentTarget.value;
        if (q) {
            this.setState({ q })
            var opts: youtubeSearch.YouTubeSearchOptions = {
                maxResults: 10,
                key: "AIzaSyDD0svyIgbg6lrE1310ma1mpiw2g3vomnc"
                // key: "AIzaSyBW-5ayHQTRcrELnx5gKJcjJc16qn2wlfk"
            };

            let g = ++this.generation;
            youtubeSearch(q, opts, (err, results) => {
                if (!err && g === this.generation) {
                    this.setState({ results: results.map(r => ({ title: r.title, id: r.id, subtitle: r.description })) })
                }
            });
        } else {
            this.setState({ q: '', results: [] })
        }
    }

    onSelect = (conent: Content) => {
        this.setState({ q: '', results: [] })
        this.props.session.add(conent);
        this.props.toQueue();
    }

    render() {
        return (
            <FlexLayout style={{ flexDirection: 'column', alignItems: 'stretch', height: '100%', overflowY: 'hidden', backgroundColor: 'rgba(249,249,249,1)' }}>
                <FlexLayout style={{ flexDirection: 'row' }}>
                    <Button onClick={this.toQueue} style={{ width: 1, backgroundColor: 'transparent', position: 'absolute', marginTop: 16, marginLeft: 14, zIndex: 200 }}>👈</Button>
                    <Input autoFocus={true} style={{ flexGrow: 1, flexShrink: 0, backgroundColor: '#fff', height: 40, borderRadius: 10, margin: 20, padding: 10, zIndex: 100, paddingLeft: 40 }} value={this.state.q} onChange={this.onInputChange} />
                </FlexLayout>
                <FlexLayout style={{ flexDirection: 'column', overflowY: 'scroll', flexGrow: 1, height: 1, marginTop: -80, paddingTop: 80 }}>
                    {this.state.q && this.state.results.map(r => (
                        <FlexLayout onClick={() => this.onSelect(r)}>
                            <ContentItem content={{ id: r.id, title: r.title }} subtitle={r.subtitle} />
                        </FlexLayout>
                    ))}
                </FlexLayout>

            </FlexLayout>
        );
    }
}

class ContentItem extends React.PureComponent<{ content: Content, subtitle?: string }>{
    render() {
        return (
            <FlexLayout style={{ flexDirection: 'row', marginLeft: 10, marginRight: 10, height: 70 }}>
                <Player id={this.props.content.id} width={100} height={70} />
                <FlexLayout style={{ flexDirection: 'column', wordWrap: 'break-word', maxWidth: 200 }}>
                    <span style={{ fontWeight: 500, width: '100%' }}>{(this.props.content.title).substr(0, 40)}</span>
                    <FlexLayout style={{ flexGrow: 1, justifyContent: 'flex-end' }}>
                        {this.props.subtitle && <span style={{ fontWeight: 500, opacity: 0.5 }}>{this.props.subtitle.substr(0, 25)}</span>}
                    </FlexLayout>
                </FlexLayout>
            </FlexLayout>
        );
    }
}