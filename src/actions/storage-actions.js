/*
 * Copyright (C) 2023 Red Hat, Inc.
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with This program; If not, see <http://www.gnu.org/licenses/>.
 */

import cockpit from "cockpit";

import {
    gatherRequests,
    getAllDiskSelection,
    getDeviceData,
    getDevices,
    getDiskFreeSpace,
    getDiskTotalSpace,
    getFormatData,
    getPartitioningMethod,
    getUsableDisks,
} from "../apis/storage.js";

export const getDevicesAction = () => {
    return async function fetchUserThunk (dispatch) {
        const devices = await getDevices();
        return devices[0].map(device => dispatch(getDeviceDataAction({ device })));
    };
};

export const getDeviceDataAction = ({ device }) => {
    return async function fetchUserThunk (dispatch) {
        let devData = {};
        const deviceData = await getDeviceData({ disk: device })
                .then(res => {
                    devData = res[0];
                    return getDiskFreeSpace({ diskNames: [device] });
                })
                .then(free => {
                    // Since the getDeviceData returns an object with variants as values,
                    // extend it with variants to keep the format consistent
                    devData.free = cockpit.variant(String, free[0]);
                    return getDiskTotalSpace({ diskNames: [device] });
                })
                .then(total => {
                    devData.total = cockpit.variant(String, total[0]);
                    return getFormatData({ diskName: device });
                })
                .then(formatData => {
                    devData.formatData = formatData[0];
                    return ({ [device]: devData });
                })
                .catch(console.error);

        return dispatch({
            type: "GET_DEVICE_DATA",
            payload: { deviceData }
        });
    };
};

export const getDiskSelectionAction = () => {
    return async function fetchUserThunk (dispatch) {
        const usableDisks = await getUsableDisks();
        const diskSelection = await getAllDiskSelection();

        return dispatch({
            type: "GET_DISK_SELECTION",
            payload: {
                diskSelection: {
                    ignoredDisks: diskSelection[0].IgnoredDisks.v,
                    selectedDisks: diskSelection[0].SelectedDisks.v,
                    usableDisks: usableDisks[0],
                }
            },
        });
    };
};

export const getPartitioningDataAction = ({ requests, partitioning, updateOnly }) => {
    return async function fetchUserThunk (dispatch) {
        const props = { path: partitioning };
        const convertRequests = reqs => reqs.map(request => Object.entries(request).reduce((acc, [key, value]) => ({ ...acc, [key]: value.v }), {}));

        if (!updateOnly) {
            props.method = await getPartitioningMethod({ partitioning });
            if (props.method === "MANUAL") {
                const reqs = await gatherRequests({ partitioning });

                props.requests = convertRequests(reqs[0]);
            }
        } else {
            props.requests = convertRequests(requests);
        }

        return dispatch({
            type: "GET_PARTITIONING_DATA",
            payload: { path: partitioning, partitioningData: props }
        });
    };
};
