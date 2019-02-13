import * as React from "react";
import * as Cookie from 'js-cookie';
import { QueueSession } from "./model/session";
import { QueueContent, Content } from "../../server/src/model/entity";
import { FlexLayout, Input, Button } from "./ui/ui";
import * as youtubeSearch from "youtube-search";
import { Player } from "./Host";

export const endpoint = window.location.hostname.indexOf('localhost') >= 0 ? 'http://localhost:5000' : '';

export class Client extends React.PureComponent<{}, { playing?: QueueContent, queue: QueueContent[], inited: boolean, mode: 'queue' | 'search' }> {
    session = new QueueSession();

    constructor(props: any) {
        super(props);
        this.state = { queue: [], mode: 'queue', inited: false };
    }

    componentDidMount() {
        this.session.onPlayingChange(p => this.setState({ playing: p }))
        this.session.onQueueChange(q => this.setState({ queue: q.queue, inited: q.inited }))
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
                    {this.state.inited && <QueuePage toSearch={this.toSearch} playing={this.state.playing} queue={this.state.queue} session={this.session} />}
                    {!this.state.inited && <FlexLayout style={{ fontWeight: 900, fontSize: 30, width: '100%', height: '100%', color: '#fff', justifyContent: 'center', textAlign: 'center' }}>Connecting... 🙌</FlexLayout>}
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
            <FlexLayout style={{ flexDirection: 'column', paddingBottom: 100, alignItems: 'stretch', marginTop: 0, height: '100%', width: '100%', overflowX: 'hidden', backgroundColor: 'rgba(249,249,249,1)' }}>
                {this.props.playing && <PlayingContent session={this.props.session} playing={this.props.playing} />}
                {!this.props.playing && (
                    <FlexLayout style={{ backgroundColor: '#000', height: 200, alignSelf: 'stretch', color: '#fff', fontWeight: 900, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }} >
                        No music to play 🤷‍♂️
                    <Button onClick={this.toSearch} style={{ border: '5px solid #fff', marginTop: 15, fontSize: 30, fontWeight: 900, color: "#fff", backgroundColor: '#000' }}>Start party 🎉</Button>
                    </FlexLayout>
                )}
                <Queue queue={this.props.queue} session={this.props.session} />

                <Button onClick={this.toSearch} style={{ position: 'fixed', zIndex: 300, bottom: 0, left: 0, right: 0, borderRadius: 0, backgroundColor: '#000', alignSelf: 'stretch', fontSize: 30, fontWeight: 900, color: "#fff" }}>Add something cool 😎</Button>
            </FlexLayout>
        );
    }
}

class PlayingContent extends React.PureComponent<{ session: QueueSession, playing: QueueContent }>{
    onVoteUp = () => {
        this.props.session.vote(this.props.playing.queueId, true);
    }
    onVoteDown = () => {
        this.props.session.vote(this.props.playing.queueId, false);
    }
    onSkip = () => {
        this.props.session.skip(this.props.playing.queueId);
    }
    render() {
        let ups = 0;
        let downs = 0;
        let meUp = false;
        let meDown = false;
        this.props.playing.votes.map(v => {
            console.warn(v.user, this.props.session.clientId);
            if (v.up) {
                ups++;
                meUp = meUp || (v.user.id === this.props.session.clientId);
            } else {
                downs++;
                meDown = meDown || (v.user.id === this.props.session.clientId);
            }

        });
        return (
            <FlexLayout style={{ position: 'relative' }}>
                <Player height={200} id={this.props.playing.id} />
                <FlexLayout style={{ position: 'absolute', flexDirection: 'row', left: 20, bottom: 20, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 20 }}>
                    <Button onClick={this.onVoteUp} style={{ backgroundColor: 'transparent', height: 20, textAlign: 'right' }}><span style={{ color: meUp ? 'green' : 'black', marginTop: 1 }}>{ups}</span>🤘</Button>
                    {!this.props.playing.canSkip && <Button onClick={this.onVoteDown} style={{ backgroundColor: 'transparent', height: 20, textAlign: 'right' }}><span style={{ color: meDown ? 'red' : 'black', marginTop: 1 }}>{downs}</span>👎</Button>}
                    {this.props.playing.canSkip && <Button onClick={this.onSkip} style={{ backgroundColor: 'transparent', height: 20, textAlign: 'right' }}>⏭</Button>}
                </FlexLayout>
            </FlexLayout>
        );
    }
}

export class Queue extends React.PureComponent<{ queue: QueueContent[], session: QueueSession }> {
    render() {
        return (
            <FlexLayout style={{ flexGrow: 1, flexDirection: 'column' }}>
                {this.props.queue.map(c => <QueueItem key={c.queueId} content={c} session={this.props.session} />)}
            </FlexLayout>
        );
    }
}

class QueueItem extends React.PureComponent<{ content: QueueContent, session: QueueSession, }>{
    onVoteUp = () => {
        this.props.session.vote(this.props.content.queueId, true);
    }
    onVoteDown = () => {
        this.props.session.vote(this.props.content.queueId, false);
    }
    onSkip = () => {
        this.props.session.skip(this.props.content.queueId);
    }
    render() {
        let ups = 0;
        let downs = 0;
        let meUp = false;
        let meDown = false;
        this.props.content.votes.map(v => {
            if (v.up) {
                ups++;
                meUp = meUp || (v.user.id === this.props.session.clientId);
            } else {
                downs++;
                meDown = meDown || (v.user.id === this.props.session.clientId);
            }

        });
        console.warn('QueueItem', this.props.content.user.id, this.props.session.clientId);
        return (
            <FlexLayout style={{ position: 'relative' }}>
                <ContentItem content={this.props.content} subtitle={this.props.content.user.id === this.props.session.clientId ? 'You - set name ✏️' : this.props.content.user.name} />
                <FlexLayout style={{ flexDirection: 'column', zIndex: 100, position: 'absolute', right: 0 }}>
                    <Button onClick={this.onVoteUp} style={{ backgroundColor: 'transparent', height: 10, textAlign: 'right' }}><span style={{ color: meUp ? 'green' : 'black', marginTop: 1 }}>{ups ? ups : ''}</span>🤘</Button>
                    {!this.props.content.canSkip && <Button onClick={this.onVoteDown} style={{ backgroundColor: 'transparent', height: 10, textAlign: 'right' }}><span style={{ color: meDown ? 'red' : 'black', marginTop: 1 }}>{downs ? downs : ''}</span>👎</Button>}
                    {this.props.content.canSkip && <Button onClick={this.onSkip} style={{ backgroundColor: 'transparent', height: 10, textAlign: 'right' }}>⏭</Button>}
                </FlexLayout>
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

            if (q.includes('youtu.be')) {
                // direct link
                let split = q.split('/');
                let id = split[split.length - 1];
                this.setState({ results: [{ title: 'direkt', id, subtitle: 'link' }] })

            } else {
                // search
                var opts: youtubeSearch.YouTubeSearchOptions = {
                    maxResults: 10,
                    // key: "AIzaSyDD0svyIgbg6lrE1310ma1mpiw2g3vomnc"
                    key: "AIzaSyBW-5ayHQTRcrELnx5gKJcjJc16qn2wlfk"
                    // key: "AIzaSyBFnDOcWBoMBCLGUjoC0znC0GwN2WlnD8Y"

                };

                let g = ++this.generation;
                youtubeSearch(q, opts, (err, results) => {
                    if (!err && g === this.generation) {
                        this.setState({ results: results.map(r => ({ title: r.title, id: r.id, subtitle: r.description })) })
                    }
                });
            }

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

class ContentItem extends React.PureComponent<{ content: Content, subtitle?: string, subtitleCallback?: () => void }>{
    render() {
        return (
            <FlexLayout style={{ flexDirection: 'row', marginLeft: 10, marginRight: 10, height: 70 }}>
                <Player id={this.props.content.id} width={100} height={70} />
                <FlexLayout style={{ flexDirection: 'column', wordWrap: 'break-word', maxWidth: 200 }}>
                    <span style={{ fontWeight: 500, width: '100%' }}>{(this.props.content.title).substr(0, 35)}</span>
                    <FlexLayout style={{ flexGrow: 1, justifyContent: 'flex-end' }}>
                        {this.props.subtitle && <span onClick={this.props.subtitleCallback} style={{ fontWeight: 500, opacity: 0.5 }}>{this.props.subtitle.substr(0, 20)}</span>}
                    </FlexLayout>
                </FlexLayout>
            </FlexLayout>
        );
    }
}
