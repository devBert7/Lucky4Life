let delUserEntry = document.getElementsByClassName('delUserEntry'),
	closeErr = document.getElementById('closeErr');

for (let i = 0; i < delUserEntry.length; i++) {
	delUserEntry[i].addEventListener('click', deleteUser);
}

function deleteUser (e) {
	e.preventDefault();
	let confirmation = confirm('Are you sure?');
	if (confirmation) {
		fetch(`/user/entry/delete/${this.dataset.id}`, {
			method: 'delete'
		})
			.catch(err => console.log(err));
		window.location.replace('/');
	} else {
		return false;
	}
}

if (closeErr) {
	closeErr.addEventListener('click', e => {
		e.preventDefault();
		window.location.replace('/');
	});	
}

/*
	- add winning amount and claim by date to each ticket
	- Eventually look at a sort button that submits and organizes the massive information in some meaningful way
	- Log in and out system for various users
	- https://www.luckyforlife.us/ (Lucky for life drawing site - where I can get the videos and order of numbers drawn)
		- This will allow me to be ultra precise in returning 'most common' situations.
	- Build an 'about' modal - shiny button
	- Last day to claim prize form (Maybe figure out the math of the date and learn to multiply / add dates)
	- Reverse sort winning date
	- Track occurance rate of any particular number (basic and lucky balls)
		- Produce an array of most likely to occur, in order
			- Both regular and lucky balls
			- Produce a special array (perhaps later) where the order of the balls drawn is taken into account (serious research) and produce an
			array of most-likely to occur in a particular order.
				- For example... combos (abc, acb, abd, abx, abx, and abc) would return the most common combination
					- in this example, abc occurs 2 times and completes all 3 letters, so it goes first
					- next is ab, occuring 5 times in the 2-character-value spot.
				- Return only the top 3 results.
	- Make it simple to enter a single set of numbers for a date-range (series of draws)
	- Look more deeply into custom express validation at some point
*/