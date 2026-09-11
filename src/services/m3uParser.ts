import { Channel, PlaylistMeta } from '../types';

export function parseM3U(content: string, playlistId: string): { channels: Channel[]; groups: string[] } {
  const lines = content.split(/\r?\n/);
  const channels: Channel[] = [];
  const groupsSet = new Set<string>();

  let currentInfo: Partial<Channel> | null = null;
  let channelIndex = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      // Parse #EXTINF attributes
      // Example: #EXTINF:-1 tvg-id="cnn" tvg-name="CNN" tvg-logo="https://..." group-title="News",CNN International
      const rawInf = line.substring(8);
      const commaIndex = rawInf.lastIndexOf(',');
      
      let name = 'Channel ' + channelIndex;
      let attributesPart = rawInf;

      if (commaIndex !== -1) {
        name = rawInf.substring(commaIndex + 1).trim() || name;
        attributesPart = rawInf.substring(0, commaIndex);
      }

      // Regex helpers for key="value" or key=value
      const tvgIdMatch = attributesPart.match(/tvg-id=["']([^"']+)["']/i);
      const tvgNameMatch = attributesPart.match(/tvg-name=["']([^"']+)["']/i);
      const tvgLogoMatch = attributesPart.match(/tvg-logo=["']([^"']+)["']/i);
      const groupTitleMatch = attributesPart.match(/group-title=["']([^"']+)["']/i);
      const chnoMatch = attributesPart.match(/tvg-chno=["']([^"']+)["']/i) || attributesPart.match(/channel-number=["']([^"']+)["']/i);

      let group = 'General';
      if (groupTitleMatch && groupTitleMatch[1]?.trim()) {
        group = groupTitleMatch[1].trim();
      }

      groupsSet.add(group);

      currentInfo = {
        id: `${playlistId}_ch_${channelIndex}_${Date.now()}`,
        name: name.replace(/[\r\n]+/g, '').trim(),
        group,
        logo: tvgLogoMatch ? tvgLogoMatch[1].trim() : undefined,
        tvgId: tvgIdMatch ? tvgIdMatch[1].trim() : undefined,
        tvgName: tvgNameMatch ? tvgNameMatch[1].trim() : undefined,
        channelNumber: chnoMatch ? parseInt(chnoMatch[1], 10) : channelIndex,
        addedAt: Date.now(),
      };
    } else if (line.startsWith('#EXTGRP:')) {
      // Alternative group format
      const grp = line.substring(8).trim();
      if (currentInfo && grp) {
        currentInfo.group = grp;
        groupsSet.add(grp);
      }
    } else if (!line.startsWith('#')) {
      // It's a stream URL!
      if (line.startsWith('http://') || line.startsWith('https://') || line.startsWith('rtmp://')) {
        const streamUrl = line.trim();
        const chName = currentInfo?.name || `Channel ${channelIndex}`;
        const chGroup = currentInfo?.group || 'General';
        groupsSet.add(chGroup);

        channels.push({
          id: currentInfo?.id || `${playlistId}_ch_${channelIndex}_${Date.now()}`,
          name: chName,
          url: streamUrl,
          group: chGroup,
          logo: currentInfo?.logo,
          tvgId: currentInfo?.tvgId,
          tvgName: currentInfo?.tvgName,
          channelNumber: currentInfo?.channelNumber || channelIndex,
          addedAt: Date.now(),
        });

        channelIndex++;
        currentInfo = null;
      }
    }
  }

  // Ensure 'General' or other groups are in order
  const groups = Array.from(groupsSet).sort((a, b) => a.localeCompare(b));

  return { channels, groups };
}

// Curated high-reliability live HLS public streams for immediate test & enjoyment
export const CURATED_DEMO_CHANNELS_M3U = `#EXTM3U
#EXTINF:-1 tvg-id="NASA.Public" tvg-name="NASA TV" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg" group-title="Science & Space",NASA TV Ultra HD Live
https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8

#EXTINF:-1 tvg-id="Bloomberg.us" tvg-name="Bloomberg Quicktake" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Bloomberg_Quicktake_Logo.svg/1200px-Bloomberg_Quicktake_Logo.svg.png" group-title="News & Finance",Bloomberg Originals Global
https://bloomberg.com/media-manifest/streams/us.m3u8

#EXTINF:-1 tvg-id="RedBullTV.at" tvg-name="Red Bull TV" tvg-logo="https://resources.redbull.com/logos/redbulltv/v3/redbulltv_logo.png" group-title="Sports & Extreme",Red Bull TV Live
https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8

#EXTINF:-1 tvg-id="Euronews.en" tvg-name="Euronews English" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Euronews_2016_logo.svg/1200px-Euronews_2016_logo.svg.png" group-title="News & Finance",Euronews Live English
https://euronews-euronews-world-1-au.samsung.wurl.tv/playlist.m3u8

#EXTINF:-1 tvg-id="DW.en" tvg-name="DW English" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Deutsche_Welle_logo.svg/1200px-Deutsche_Welle_logo.svg.png" group-title="News & Finance",DW News 24/7 (HD)
https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8

#EXTINF:-1 tvg-id="France24.en" tvg-name="France 24 EN" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/France_24_logo.svg/1200px-France_24_logo.svg.png" group-title="News & Finance",France 24 English
https://static.france24.com/live/F24_EN_LO_HLS/live_tv.m3u8

#EXTINF:-1 tvg-id="SkyNews.uk" tvg-name="Sky News" tvg-logo="https://upload.wikimedia.org/wikipedia/en/thumb/9/91/Sky_News_logo_2020.svg/1200px-Sky_News_logo_2020.svg.png" group-title="News & Finance",Sky News Live
https://skynewsau-live.akamaized.net/hls/live/2002689/skynewsau-extra1/master.m3u8

#EXTINF:-1 tvg-id="AlJazeera.en" tvg-name="Al Jazeera" tvg-logo="https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Al_Jazeera_English_logo.svg/1200px-Al_Jazeera_English_logo.svg.png" group-title="News & Finance",Al Jazeera English HD
https://live-hls-web-aje.getaj.net/AJE/03.m3u8

#EXTINF:-1 tvg-id="Test.BBB" tvg-name="Test 1080p 60fps" tvg-logo="https://peach.blender.org/wp-content/uploads/title_peach.jpg" group-title="Test & Calibrate",Low-Latency HLS 60FPS Benchmark (Akamai)
https://cph-p2p-msl.akamaized.net/hls/live/200034/test/master.m3u8

#EXTINF:-1 tvg-id="Test.TearsOfSteel" tvg-name="Tears of Steel" tvg-logo="https://mango.blender.org/wp-content/themes/mango/images/logo.png" group-title="Test & Calibrate",Cinema 4K High-Bitrate Stream Test
https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8

#EXTINF:-1 tvg-id="Lofi.Stream" tvg-name="Lo-Fi Chill" tvg-logo="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&q=80" group-title="Music & Chill",Lo-Fi Lounge & Ambient Audio/Video
https://stream.ecable.tv/bigbucks/tracks-v1a1/mono.m3u8
`;

export function getCuratedPlaylist(): { playlist: PlaylistMeta; channels: Channel[] } {
  const playlistId = 'curated_global_stream';
  const { channels, groups } = parseM3U(CURATED_DEMO_CHANNELS_M3U, playlistId);
  const playlist: PlaylistMeta = {
    id: playlistId,
    name: 'Apex Curated Global Streams (Live)',
    sourceType: 'preset',
    channelCount: channels.length,
    groups,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return { playlist, channels };
}
