import React from 'react';
import _ from 'underscore';

import Card from '../Card';

/**
* Display a list of saving goals to the user, depends on Card component
* @param {Object} props contains array of items to Display
*/
const List = (props) => {
    
    if(!props.items || !_.isArray(props.items) || _.isEmpty(props.items))
    {
        throw new Error("items need to be provided as a prop");
    }

    const renderItems = (items) => {
        return items.map((item) => {
            return <Card item={item} key={item.uid}/>
        });
    }
    return (
        <div className="ui link cards" style={{'paddingTop': '35px'}}>
            {renderItems(props.items)}
        </div>
    );
    
}

export default List;