// Full-text search (docs) with nav fallback
(function(){
	const input=document.getElementById('search');
	if(!input)return;
	const results=document.getElementById('search-results');
	const links=Array.from(document.querySelectorAll('.nav a'));
	let docs=null;
	let loading=false;

	function normalize(value){
		return (value||'').toLowerCase();
	}

	function clearResults(){
		if(!results)return;
		results.innerHTML='';
		results.style.display='none';
	}

	function showNoMatches(){
		if(!results)return;
		results.innerHTML='';
		const empty=document.createElement('div');
		empty.className='search-empty';
		empty.textContent='No matches';
		results.appendChild(empty);
		results.style.display='block';
	}

	function showResults(items){
		if(!results)return;
		results.innerHTML='';
		const frag=document.createDocumentFragment();
		items.slice(0,20).forEach(doc=>{
			const link=document.createElement('a');
			link.href=buildResultUrl(doc.location||'#',input.value);
			const title=document.createElement('div');
			title.className='search-title';
			title.textContent=doc.title||doc.location||'Untitled';
			const snippet=document.createElement('div');
			snippet.className='search-snippet';
			snippet.textContent=doc.snippet||'';
			link.appendChild(title);
			link.appendChild(snippet);
			frag.appendChild(link);
		});
		results.appendChild(frag);
		results.style.display='block';
	}

	function getBaseUrl(){
		const base=(document.body&&document.body.getAttribute('data-base-url'))||'';
		if(!base||base==='.')return '';
		return base.endsWith('/')?base.slice(0,-1):base;
	}

	function buildResultUrl(location,query){
		if(!location)return '#';
		const q=encodeURIComponent((query||'').trim());
		const parts=location.split('#');
		let path=parts[0]||'';
		const hash=parts[1]?('#'+parts[1]):'';
		const base=getBaseUrl();
		if(path&&path[0]!=='/'&&path.indexOf('://')===-1){
			const prefix=base?('/'+base.replace(/^\/+/,'')):'';
			path=prefix+'/'+path.replace(/^\/+/, '');
		}
		const joiner=path.includes('?')?'&':'?';
		return q?path+joiner+'q='+q+hash:path+hash;
	}

	async function loadIndex(){
		if(docs||loading)return;
		loading=true;
		try{
			const base=getBaseUrl();
			const url=(base?base+'/':'')+'search/search_index.json';
			const response=await fetch(url);
			if(!response.ok)throw new Error('search index missing');
			const data=await response.json();
			const items=data.docs||data.documents||data.items||[];
			docs=items.map(item=>({
				title:item.title||'',
				text:item.text||'',
				location:item.location||item.url||''
			}));
		}catch(err){
			docs=[];
		}finally{
			loading=false;
		}
	}

	input.addEventListener('focus',loadIndex);

	input.addEventListener('input',()=>{
		const query=normalize(input.value).trim();
		if(!query){
			clearResults();
			links.forEach(a=>{a.style.display='';});
			return;
		}
		if(docs&&docs.length){
			const matches=docs.filter(doc=>{
				return normalize(doc.title).includes(query)||normalize(doc.text).includes(query);
			}).map(doc=>{
				const text=normalize(doc.text);
				const index=text.indexOf(query);
				let snippet='';
				if(index>=0){
					const raw=doc.text||'';
					const start=Math.max(0,index-50);
					const end=Math.min(raw.length,index+query.length+70);
					snippet=raw.slice(start,end).replace(/\s+/g,' ').trim();
					if(start>0)snippet='... '+snippet;
					if(end<raw.length)snippet=snippet+' ...';
				}
				return {
					title:doc.title,
					text:doc.text,
					location:doc.location,
					snippet:snippet
				};
			});
			if(matches.length){
				showResults(matches);
			}else{
				showNoMatches();
			}
			return;
		}
		if(!loading){
			links.forEach(a=>{
				const text=normalize(a.textContent);
				a.style.display=text.includes(query)?'':'none';
			});
		}
	});

	document.addEventListener('click',event=>{
		if(!results)return;
		if(event.target===input||results.contains(event.target))return;
		clearResults();
	});

	function getQueryParam(){
		const params=new URLSearchParams(window.location.search);
		return (params.get('q')||'').trim();
	}

	function shouldSkipNode(node){
		if(!node||!node.parentElement)return true;
		const tag=node.parentElement.tagName;
		return tag==='SCRIPT'||tag==='STYLE'||tag==='CODE'||tag==='PRE'||tag==='A'||tag==='NAV'||tag==='ASIDE'||tag==='INPUT'||tag==='TEXTAREA';
	}

	function highlightMatches(text,query){
		const normalized=normalize(text);
		const q=normalize(query);
		const index=normalized.indexOf(q);
		if(index<0)return null;
		const before=text.slice(0,index);
		const match=text.slice(index,index+query.length);
		const after=text.slice(index+query.length);
		return {before,match,after};
	}

	function highlightPageQuery(){
		const query=getQueryParam();
		if(!query)return;
		const main=document.querySelector('.main');
		if(!main)return;
		const walker=document.createTreeWalker(main,NodeFilter.SHOW_TEXT,null,false);
		const nodes=[];
		while(walker.nextNode()){
			const node=walker.currentNode;
			if(!node||!node.nodeValue||!node.nodeValue.trim())continue;
			if(shouldSkipNode(node))continue;
			if(normalize(node.nodeValue).includes(normalize(query)))nodes.push(node);
		}
		nodes.forEach(node=>{
			const parts=highlightMatches(node.nodeValue,query);
			if(!parts)return;
			const span=document.createElement('span');
			span.appendChild(document.createTextNode(parts.before));
			const mark=document.createElement('mark');
			mark.className='search-hit';
			mark.textContent=parts.match;
			span.appendChild(mark);
			span.appendChild(document.createTextNode(parts.after));
			node.parentElement.replaceChild(span,node);
		});
	}

	document.addEventListener('DOMContentLoaded',highlightPageQuery);
})();
