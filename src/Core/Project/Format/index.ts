/*
 * Copyright 2021 Zindex Software
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type {Exporter, Importer} from "@zindex/canvas-engine";
import {AnimationProject} from "../AnimationProject";
import {AnimatorSource} from "../../Animation";
import type {AnimationDocument} from "../AnimationDocument";
import {compress, decompress, toStream, Serializer, readBytes} from "@zindex/canvas-engine";
import LegacyImport from "./LegacyImport";

export const CURRENT_VERSION = 400;

export type Manifest = {
    version: number,
    type: string,
    easing?: any[],
    assets?: any[],
    documents: string[],
    masterDocument: string,
}

export enum FileMarker {
    // ex7e
    SOF = 0x65377865,
    EOF = 0xef,

    MANIFEST = 0x01,
    //ASSET = 0x02,
    DOCUMENT = 0x03,
}

const JSON_MIME = {type: 'application/json'};

async function compressJSON(data: string): Promise<Uint8Array> {
    return compress((new Blob([data], JSON_MIME)).stream());
}

async function decompressJSON(data: DataView): Promise<string> {
    return (new Blob([await decompress(toStream(data))], JSON_MIME)).text();
}

export class NativeAnimationExporter implements Exporter<AnimationProject> {
    async export(project: AnimationProject): Promise<ReadableStream> {
        const self = this;

        return new ReadableStream<any>({
            async start(controller) {
                const manifest = await compressJSON(JSON.stringify(self.getManifest(project)));

                const view = new DataView(new ArrayBuffer( 9));

                view.setUint32(0, FileMarker.SOF); // Start
                view.setUint8(4, FileMarker.MANIFEST); // Manifest type
                view.setUint32(5, manifest.length);

                controller.enqueue(view.buffer);
                controller.enqueue(manifest);
            },

            async pull(controller) {
                // assets
                // for (const asset of project.getAssets()) {
                //     const data = await compressJSON(self.serializeAsset(asset));
                //
                //     const view = new DataView(new ArrayBuffer(5));
                //     view.setUint8(0, FileMarker.ASSET); // Document type
                //     view.setUint32(1, data.length); // Document length
                //
                //     controller.enqueue(view.buffer);
                //     controller.enqueue(data);
                // }

                // documents
                for (const document of project.getDocuments()) {
                    const data = await compressJSON(self.serializeDocument(document));

                    const view = new DataView(new ArrayBuffer(5));
                    view.setUint8(0, FileMarker.DOCUMENT); // Document type
                    view.setUint32(1, data.length); // Document length

                    controller.enqueue(view.buffer);
                    controller.enqueue(data);
                }

                controller.enqueue((new Uint8Array([FileMarker.EOF])).buffer); // End

                // const view = new DataView(new ArrayBuffer(1));
                // view.setUint8(0, 0xef); // eof
                // controller.enqueue(view.buffer);

                controller.close();
            }
        });
    }

    protected getManifest(project: AnimationProject): Manifest {
        const data: any = {
            version: CURRENT_VERSION,
            type: 'expressive/animation',
            documents: [],
            easing: Array.from(project.easingManager.custom()),
            // TODO: assets
            // assets: [],
            masterDocument: project.masterDocument.id
        };

        for (const doc of project.getDocuments()) {
            data.documents.push(doc.id);
        }

        return data;
    }

    protected serializeDocument(document: AnimationDocument): string {
        return Serializer.serialize(document);
    }

    protected serializeAsset(asset): string {
        // TODO: implement asset serialization
        return '';
    }

    dispose(): void {
    }
}

export class NativeAnimationImporter implements Importer<AnimationProject> {
    async import(stream: ReadableStream): Promise<AnimationProject> {
        const project = new AnimationProject(new AnimatorSource());

        const bytes = await readBytes(stream);
        const view = new DataView(bytes.buffer);

        let offset = 0;

        if (view.getInt32(offset) !== FileMarker.SOF) {
            throw new Error('Unknown file type');
        }

        offset += 4;
        if (view.getUint8(offset) !== FileMarker.MANIFEST) {
            throw new Error('Invalid file type');
        }
        offset++;

        const manifestLength = view.getInt32(offset);
        offset += 4;
        const manifest = await this.readManifest(new DataView(bytes.buffer, offset, manifestLength));
        offset += manifestLength;

        if (manifest.type !== 'expressive/animation') {
            throw new Error('Invalid file type');
        }

        // when LegacyImport is removed, uncomment this
        // if (manifest.version < 400) {
        //     throw new Error('Unsupported legacy version');
        // }

        // Add easing functions
        if (manifest.easing != null && manifest.easing.length > 0) {
            manifest.easing.forEach(json => project.easingManager.addFromJSON(json));
        }

        while (true) {
            const entryType = view.getUint8(offset);
            if (entryType === FileMarker.EOF) { // eof
                break;
            }
            // if (entryType === FileMarker.ASSET) {
            //
            // }

            if (entryType === FileMarker.DOCUMENT) {
                const length = view.getUint32(offset + 1);
                offset += 5;
                const document = await this.readDocument(new DataView(bytes.buffer, offset, length), project, manifest);
                if (document) {
                    project.addDocument(document);
                }
                offset += length;
                continue;
            }

            offset++;

            if (offset >= bytes.length) {
                throw new Error('Unexpected EOF');
            }
        }

        project.masterDocument = project.getDocumentById(manifest.masterDocument);

        return project;
    }

    protected async readManifest(data: DataView): Promise<Manifest> {
        return JSON.parse(await decompressJSON(data));
    }

    protected legacyImport: LegacyImport = null;

    protected async readDocument(data: DataView, project: AnimationProject, manifest: Manifest): Promise<AnimationDocument> {
        if (manifest.version < 400) {
            if (this.legacyImport == null) {
                this.legacyImport = new LegacyImport(project);
            }
            return this.legacyImport.deserializeDocument(JSON.parse(await decompressJSON(data)));
        }

        return Serializer.deserialize(await decompressJSON(data), manifest.version.toString(), project);
    }

    dispose(): void {
        this.legacyImport = null;
    }
}